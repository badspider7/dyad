import fsAsync from "node:fs/promises";
import path from "node:path";
import { gitIsIgnored } from "../ipc/utils/git_utils";
import log from "electron-log";
import { IS_TEST_BUILD } from "../ipc/utils/test_utils";
import { glob } from "glob";
import { AppChatContext } from "../lib/schemas";

import { AsyncVirtualFileSystem } from "../../shared/VirtualFilesystem";

/**
 * 这个文件用于提取和格式化代码库文件
 * 主要功能：
 * 1. 递归扫描目录，收集相关文件
 * 2. 根据 gitignore、扩展名等规则过滤文件
 * 3. 缓存文件内容以提高性能
 * 4. 格式化文件输出，用于AI对话中的代码上下文
 * 5. 支持虚拟文件系统，允许对文件进行临时修改
 */

const logger = log.scope("utils/codebase");

/**
 * ========================================================================
 * 常量定义区
 * ========================================================================
 */

// 允许提取的文件扩展名列表
// 这些类型的文件会被包含在代码库上下文中发送给AI
const ALLOWED_EXTENSIONS = [
  ".ts",       // TypeScript 源文件
  ".tsx",      // TypeScript JSX 文件（React组件）
  ".js",       // JavaScript 源文件
  ".jsx",      // JavaScript JSX 文件（React组件）
  ".mjs",      // ES 模块
  ".cjs",      // CommonJS 模块
  ".mts",      // TypeScript ES 模块
  ".cts",      // TypeScript CommonJS 模块
  ".css",      // 样式表
  ".html",     // HTML 文件
  ".md",       // Markdown 文档
  ".astro",    // Astro 框架文件
  ".vue",      // Vue 组件
  ".svelte",   // Svelte 组件
  ".scss",     // Sass 样式
  ".sass",     // Sass 样式
  ".less",     // Less 样式
  // 常用作配置文件（如 package.json, vercel.json）或数据文件（如翻译文件）
  ".json",
  // GitHub Actions 工作流文件
  ".yml",
  ".yaml",
  // Capacitor 项目所需文件
  ".xml",
  ".plist",
  ".entitlements",
  ".kt",       // Kotlin
  ".java",     // Java
  ".gradle",   // Gradle 构建脚本
  ".swift",    // Swift
  // 边缘情况
  // https://github.com/dyad-sh/dyad/issues/880
  ".py",       // Python
  // https://github.com/dyad-sh/dyad/issues/1221
  ".php",      // PHP
];

// 始终要排除的目录列表
// 通常这些目录会被gitignore排除，但有时用户没有正确配置gitignore
// 所以我们要保守一些，永远不会包含这些目录
// 示例：https://github.com/dyad-sh/dyad/issues/727
// Normally these files are excluded by the gitignore, but sometimes
// people don't have their gitignore setup correctly so we want to
// be conservative and never include these directories.
//
// ex: https://github.com/dyad-sh/dyad/issues/727
const EXCLUDED_DIRS = [
  "node_modules",  // 依赖包目录
  ".git",          // Git版本控制目录
  "dist",          // 构建输出目录
  "build",         // 构建输出目录
  ".next",         // Next.js构建目录
  ".venv",         // Python虚拟环境
  "venv",          // Python虚拟环境
];

// 始终要排除的文件列表（通常是不需要的锁文件）
const EXCLUDED_FILES = ["pnpm-lock.yaml", "package-lock.json"];

// 始终要包含的文件列表，无论扩展名是什么
const ALWAYS_INCLUDE_FILES = [".gitignore"];

// 始终要省略的文件模式（文件内容会被替换为占位符）
// 我们不想将环境变量发送给LLM，因为它们是敏感的
// 用户应该通过UI来配置这些内容
const ALWAYS_OMITTED_FILES = [".env", ".env.local"];

// 要省略的文件模式（文件内容会被替换为占位符）
//
// 为什么这里不使用 path.join？
// 因为我们已经规范化路径使用 /
//
// 注意：这些文件仅在不使用智能上下文时被省略
//
// 为什么在不使用智能上下文时要省略这些文件？
// 因为这些文件通常是低价值的，将它们添加到上下文中
// 会使用户更快地达到免费使用限额
const OMITTED_FILES = [
  ...ALWAYS_OMITTED_FILES,  // 包含所有始终省略的文件
  "src/components/ui",      // UI 组件库文件（通常是低信号的）
  "eslint.config",          // ESLint 配置
  "tsconfig.json",          // TypeScript 配置
  "tsconfig.app.json",      // TypeScript 应用配置
  "tsconfig.node.json",     // TypeScript Node 配置
  "tsconfig.base.json",     // TypeScript 基础配置
  "components.json",         // shadcn/ui 组件配置
];

// 最大文件大小限制（字节）- 1MB
const MAX_FILE_SIZE = 1000 * 1024;

// 文件内容缓存的最大大小
const MAX_FILE_CACHE_SIZE = 500;

/**
 * ========================================================================
 * 缓存数据结构
 * ========================================================================
 */

// 带时间戳的文件内容缓存类型
type FileCache = {
  content: string;  // 文件内容
  mtime: number;    // 修改时间（毫秒时间戳）
};

// 文件内容缓存
// 使用 Map 存储文件路径和对应的缓存数据
const fileContentCache = new Map<string, FileCache>();

// Git忽略路径的缓存
// 避免重复计算同一文件是否被gitignore
const gitIgnoreCache = new Map<string, boolean>();

// 存储 .gitignore 文件路径及其修改时间的Map
// 用于检测 .gitignore 文件是否被修改，从而清除缓存
const gitIgnoreMtimes = new Map<string, number>();

/**
 * ========================================================================
 * Git 忽略检查函数
 * ========================================================================
 */

/**
 * 根据git ignore规则检查路径是否应该被忽略
 *
 * 工作原理：
 * 1. 检查从仓库根目录到文件路径之间的所有 .gitignore 文件是否被修改
 * 2. 如果有任何 .gitignore 被修改，清除缓存
 * 3. 使用缓存避免重复检查
 *
 * @param filePath - 要检查的文件路径
 * @param baseDir - 代码库的基础目录（通常是仓库根目录）
 * @returns Promise<boolean> - true表示文件被忽略，false表示不被忽略
 */
async function isGitIgnored(
  filePath: string,
  baseDir: string,
): Promise<boolean> {
  try {
    // 检查是否有相关的 .gitignore 文件被修改
    // Git 会检查从仓库根目录到文件所在路径之间的所有 .gitignore 文件
    let currentDir = baseDir;
    const pathParts = path.relative(baseDir, filePath).split(path.sep);
    let shouldClearCache = false;

    // 检查根目录的 .gitignore
    const rootGitIgnorePath = path.join(baseDir, ".gitignore");
    try {
      const stats = await fsAsync.stat(rootGitIgnorePath);
      const lastMtime = gitIgnoreMtimes.get(rootGitIgnorePath) || 0;
      if (stats.mtimeMs > lastMtime) {
        gitIgnoreMtimes.set(rootGitIgnorePath, stats.mtimeMs);
        shouldClearCache = true;
      }
    } catch {
      // 根目录可能没有 .gitignore，这是正常的
    }

    // 检查父目录中的 .gitignore 文件
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentDir = path.join(currentDir, pathParts[i]);
      const gitIgnorePath = path.join(currentDir, ".gitignore");

      try {
        const stats = await fsAsync.stat(gitIgnorePath);
        const lastMtime = gitIgnoreMtimes.get(gitIgnorePath) || 0;
        if (stats.mtimeMs > lastMtime) {
          gitIgnoreMtimes.set(gitIgnorePath, stats.mtimeMs);
          shouldClearCache = true;
        }
      } catch {
        // 这个目录可能没有 .gitignore，这是正常的
      }
    }

    // 如果任何 .gitignore 被修改，清除缓存
    if (shouldClearCache) {
      gitIgnoreCache.clear();
    }

    const cacheKey = `${baseDir}:${filePath}`;

    // 使用缓存结果
    if (gitIgnoreCache.has(cacheKey)) {
      return gitIgnoreCache.get(cacheKey)!;
    }

    // 计算并缓存结果
    const relativePath = path.relative(baseDir, filePath);
    const result = await gitIsIgnored({
      path: baseDir,
      filepath: relativePath,
    });

    gitIgnoreCache.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.error(`Error checking if path is git ignored: ${filePath}`, error);
    return false;
  }
}

/**
 * ========================================================================
 * 文件读取函数
 * ========================================================================
 */

/**
 * 带缓存的文件内容读取函数
 *
 * 工作原理：
 * 1. 如果提供了虚拟文件系统，优先从中读取（用于临时修改）
 * 2. 检查文件是否在缓存中且未被修改，如果是则使用缓存
 * 3. 否则从磁盘读取文件并更新缓存
 * 4. 自动管理缓存大小，超过限制时删除最旧的条目
 *
 * @param filePath - 要读取的文件路径
 * @param virtualFileSystem - 可选的虚拟文件系统，用于读取临时修改的文件
 * @returns Promise<string | undefined> - 文件内容，读取失败返回 undefined
 */
export async function readFileWithCache(
  filePath: string,
  virtualFileSystem?: AsyncVirtualFileSystem,
): Promise<string | undefined> {
  try {
    // 如果提供了虚拟文件系统，优先从中读取
    // 这用于处理用户在编辑器中对文件的临时修改
    if (virtualFileSystem) {
      const virtualContent = await virtualFileSystem.readFile(filePath);
      if (virtualContent != null) {
        return virtualContent;
      }
    }

    // 获取文件统计信息以检查修改时间
    const stats = await fsAsync.stat(filePath);
    const currentMtime = stats.mtimeMs;

    // 如果文件在缓存中且未被修改，使用缓存内容
    if (fileContentCache.has(filePath)) {
      const cache = fileContentCache.get(filePath)!;
      if (cache.mtime === currentMtime) {
        return cache.content;
      }
    }

    // 读取文件并更新缓存
    const rawContent = await fsAsync.readFile(filePath, "utf-8");
    const content = rawContent;
    fileContentCache.set(filePath, {
      content,
      mtime: currentMtime,
    });

    // 管理缓存大小：当缓存超过限制时，删除最旧的 25% 条目
    if (fileContentCache.size > MAX_FILE_CACHE_SIZE) {
      // 计算要删除的条目数量（25%）
      const entriesToDelete = Math.ceil(MAX_FILE_CACHE_SIZE * 0.25);
      const keys = Array.from(fileContentCache.keys());

      // 删除最旧的条目（先进先出）
      for (let i = 0; i < entriesToDelete; i++) {
        fileContentCache.delete(keys[i]);
      }
    }

    return content;
  } catch (error) {
    logger.error(`Error reading file: ${filePath}`, error);
    return undefined;
  }
}

/**
 * 递归遍历目录并收集所有相关文件
 *
 * 工作原理：
 * 1. 检查目录是否存在
 * 2. 读取目录内容
 * 3. 并发处理每个条目
 * 4. 跳过排除的目录和文件
 * 5. 跳过被 gitignore 的文件
 * 6. 跳过过大的文件（> 1MB）
 * 7. 递归处理子目录
 *
 * @param dir - 要遍历的目录
 * @param baseDir - 基础目录，用于 gitignore 检查
 * @returns Promise<string[]> - 收集到的文件路径列表
 */
async function collectFiles(dir: string, baseDir: string): Promise<string[]> {
  const files: string[] = [];

  // 检查目录是否存在
  try {
    await fsAsync.access(dir);
  } catch {
    // 目录不存在或不可访问
    return files;
  }

  try {
    // 读取目录内容
    const entries = await fsAsync.readdir(dir, { withFileTypes: true });

    // 并发处理所有条目
    const promises = entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      // 跳过排除的目录（如 node_modules, .git 等）
      if (entry.isDirectory() && EXCLUDED_DIRS.includes(entry.name)) {
        return;
      }

      // 跳过被 gitignore 的条目
      if (await isGitIgnored(fullPath, baseDir)) {
        return;
      }

      if (entry.isDirectory()) {
        // 递归处理子目录
        const subDirFiles = await collectFiles(fullPath, baseDir);
        files.push(...subDirFiles);
      } else if (entry.isFile()) {
        // 跳过排除的文件（如 lock 文件）
        if (EXCLUDED_FILES.includes(entry.name)) {
          return;
        }

        // 跳过过大的文件
        try {
          const stats = await fsAsync.stat(fullPath);
          if (stats.size > MAX_FILE_SIZE) {
            return;
          }
        } catch (error) {
          logger.error(`Error checking file size: ${fullPath}`, error);
          return;
        }

        // 将文件添加到列表
        files.push(fullPath);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    logger.error(`Error reading directory ${dir}:`, error);
  }

  return files;
}

// 被省略的文件内容占位符
const OMITTED_FILE_CONTENT = "// File contents excluded from context";

/**
 * 检查是否应该读取文件内容（基于扩展名和包含规则）
 *
 * 这个函数用于非智能上下文模式，会排除更多低价值文件
 *
 * @param filePath - 文件路径
 * @param normalizedRelativePath - 规范化的相对路径
 * @returns boolean - true 表示应该读取内容，false 表示跳过
 */
function shouldReadFileContents({
  filePath,
  normalizedRelativePath,
}: {
  filePath: string;
  normalizedRelativePath: string;
}): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  // OMITTED_FILES 优先 - 如果被省略则不读取
  if (
    OMITTED_FILES.some((pattern) => normalizedRelativePath.includes(pattern))
  ) {
    return false;
  }

  // 根据扩展名或文件名检查是否应该包含
  return (
    ALLOWED_EXTENSIONS.includes(ext) || ALWAYS_INCLUDE_FILES.includes(fileName)
  );
}

/**
 * 检查是否应该读取文件内容（用于智能上下文模式）
 *
 * 这个函数用于智能上下文模式，只省略敏感文件（如 .env）
 *
 * @param filePath - 文件路径
 * @param normalizedRelativePath - 规范化的相对路径
 * @returns boolean - true 表示应该读取内容，false 表示跳过
 */
function shouldReadFileContentsForSmartContext({
  filePath,
  normalizedRelativePath,
}: {
  filePath: string;
  normalizedRelativePath: string;
}): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  // ALWAYS_OMITTED_FILES 优先 - 如果被省略则不读取
  if (
    ALWAYS_OMITTED_FILES.some((pattern) =>
      normalizedRelativePath.includes(pattern),
    )
  ) {
    return false;
  }

  // 根据扩展名或文件名检查是否应该包含
  return (
    ALLOWED_EXTENSIONS.includes(ext) || ALWAYS_INCLUDE_FILES.includes(fileName)
  );
}

/**
 * 格式化文件以包含在代码库提取中
 *
 * 输出格式为自定义的 XML 标签：
 * ```xml
 * <dyad-file path="relative/path/to/file">
 * 文件内容
 * </dyad-file>
 * ```
 *
 * @param filePath - 文件的绝对路径
 * @param normalizedRelativePath - 规范化的相对路径
 * @param virtualFileSystem - 可选的虚拟文件系统
 * @returns Promise<string> - 格式化后的文件内容
 */
async function formatFile({
  filePath,
  normalizedRelativePath,
  virtualFileSystem,
}: {
  filePath: string;
  normalizedRelativePath: string;
  virtualFileSystem?: AsyncVirtualFileSystem;
}): Promise<string> {
  try {
    // 检查是否应该读取文件内容
    if (!shouldReadFileContents({ filePath, normalizedRelativePath })) {
      return `<dyad-file path="${normalizedRelativePath}">
${OMITTED_FILE_CONTENT}
</dyad-file>

`;
    }

    // 使用缓存读取文件内容
    const content = await readFileWithCache(filePath, virtualFileSystem);

    if (content == null) {
      return `<dyad-file path="${normalizedRelativePath}">
// Error reading file
</dyad-file>

`;
    }

    // 返回格式化的文件内容
    return `<dyad-file path="${normalizedRelativePath}">
${content}
</dyad-file>

`;
  } catch (error) {
    logger.error(`Error reading file: ${filePath}`, error);
    return `<dyad-file path="${normalizedRelativePath}">
// Error reading file: ${error}
</dyad-file>

`;
  }
}

/**
 * ========================================================================
 * 类型定义
 * ========================================================================
 */

/**
 * 基础文件接口
 */
export interface BaseFile {
  path: string;       // 文件路径
  focused?: boolean; // 是否聚焦（用于UI高亮）
  force?: boolean;   // 是否强制包含（用于智能上下文）
}

/**
 * 代码库文件接口，包含文件内容
 */
export interface CodebaseFile extends BaseFile {
  content: string;   // 文件内容
}

/**
 * 代码库文件引用接口，包含文件ID
 */
export interface CodebaseFileReference extends BaseFile {
  fileId: string;     // 文件唯一标识
}

/**
 * ========================================================================
 * 主函数：代码库提取
 * ========================================================================
 */

/**
 * 提取并格式化代码库文件，用于在提示词中包含
 *
 * 这是整个模块的核心函数，负责：
 * 1. 检查智能上下文是否启用
 * 2. 收集所有相关文件
 * 3. 应用虚拟文件系统的修改
 * 4. 处理用户指定的包含/排除路径
 * 5. 按修改时间排序文件
 * 6. 格式化文件内容
 *
 * @param appPath - 要提取的代码库路径
 * @param chatContext - 聊天上下文，包含用户指定的路径配置
 * @param virtualFileSystem - 可选的虚拟文件系统，用于应用临时修改
 * @returns Promise<{formattedOutput: string, files: CodebaseFile[]}> - 格式化输出和文件数组
 */
export async function extractCodebase({
  appPath,
  chatContext,
  virtualFileSystem,
}: {
  appPath: string;
  chatContext: AppChatContext;
  virtualFileSystem?: AsyncVirtualFileSystem;
}): Promise<{
  formattedOutput: string;
  files: CodebaseFile[];
}> {
  // 读取设置以检查智能上下文是否启用
  // const settings = readSettings();
  const isSmartContextEnabled = true;
  // settings?.enableDyadPro && settings?.enableProSmartFilesContextMode;

  // 检查目录是否存在
  try {
    await fsAsync.access(appPath);
  } catch {
    return {
      formattedOutput: `# Error: Directory ${appPath} does not exist or is not accessible`,
      files: [],
    };
  }
  const startTime = Date.now();

  // 1. 收集所有相关文件
  let files = await collectFiles(appPath, appPath);

  // 2. 如果提供了虚拟文件系统，应用其修改
  if (virtualFileSystem) {
    // 过滤掉已删除的文件
    const deletedFiles = new Set(
      virtualFileSystem
        .getDeletedFiles()
        .map((relativePath) => path.resolve(appPath, relativePath)),
    );
    files = files.filter((file) => !deletedFiles.has(file));

    // 添加虚拟文件（用户在编辑器中创建的新文件）
    const virtualFiles = virtualFileSystem.getVirtualFiles();
    for (const virtualFile of virtualFiles) {
      const absolutePath = path.resolve(appPath, virtualFile.path);
      if (!files.includes(absolutePath)) {
        files.push(absolutePath);
      }
    }
  }

  // 3. 从 contextPaths 和 smartContextAutoIncludes 收集文件
  const { contextPaths, smartContextAutoIncludes, excludePaths } = chatContext;
  const includedFiles = new Set<string>();      // 用户明确包含的文件
  const autoIncludedFiles = new Set<string>();  // 智能上下文自动包含的文件
  const excludedFiles = new Set<string>();       // 用户明确排除的文件

  // 处理用户明确包含的路径（contextPaths）
  if (contextPaths && contextPaths.length > 0) {
    for (const p of contextPaths) {
      const pattern = createFullGlobPath({
        appPath,
        globPath: p.globPath,
      });
      const matches = await glob(pattern, {
        nodir: true,
        absolute: true,
        ignore: "**/node_modules/**",
      });
      matches.forEach((file) => {
        const normalizedFile = path.normalize(file);
        includedFiles.add(normalizedFile);
      });
    }
  }

  // 处理智能上下文自动包含的路径（smartContextAutoIncludes）
  if (
    isSmartContextEnabled &&
    smartContextAutoIncludes &&
    smartContextAutoIncludes.length > 0
  ) {
    for (const p of smartContextAutoIncludes) {
      const pattern = createFullGlobPath({
        appPath,
        globPath: p.globPath,
      });
      const matches = await glob(pattern, {
        nodir: true,
        absolute: true,
        ignore: "**/node_modules/**",
      });
      matches.forEach((file) => {
        const normalizedFile = path.normalize(file);
        autoIncludedFiles.add(normalizedFile);
        includedFiles.add(normalizedFile); // 同时添加到包含的文件集合中
      });
    }
  }

  // 处理用户明确排除的路径（excludePaths）
  if (excludePaths && excludePaths.length > 0) {
    for (const p of excludePaths) {
      const pattern = createFullGlobPath({
        appPath,
        globPath: p.globPath,
      });
      const matches = await glob(pattern, {
        nodir: true,
        absolute: true,
        ignore: "**/node_modules/**",
      });
      matches.forEach((file) => {
        const normalizedFile = path.normalize(file);
        excludedFiles.add(normalizedFile);
      });
    }
  }

  // 4. 过滤文件
  // 只有当提供了 contextPaths 时才进行过滤
  // 如果只提供了 smartContextAutoIncludes，保留所有文件并将自动包含的文件标记为强制
  if (contextPaths && contextPaths.length > 0) {
    files = files.filter((file) => includedFiles.has(path.normalize(file)));
  }

  // 过滤掉排除的文件（这比包含路径优先级更高）
  if (excludedFiles.size > 0) {
    files = files.filter((file) => !excludedFiles.has(path.normalize(file)));
  }

  // 5. 按修改时间排序文件（最旧的在前）
  // 这对于缓存能力很重要
  const sortedFiles = await sortFilesByModificationTime([...new Set(files)]);

  // 6. 格式化文件并收集单个文件内容
  const filesArray: CodebaseFile[] = [];
  const formatPromises = sortedFiles.map(async (file) => {
    // 获取文件数组的原始内容
    const normalizedRelativePath = path
      .relative(appPath, file)
      // 为什么？规范化 Windows 风格的路径，这会导致很多奇怪的问题（如 Git 提交）
      .split(path.sep)
      .join("/");
    const formattedContent = await formatFile({
      filePath: file,
      normalizedRelativePath,
      virtualFileSystem,
    });

    // 检查文件是否被智能上下文自动包含且未被排除
    const isForced =
      autoIncludedFiles.has(path.normalize(file)) &&
      !excludedFiles.has(path.normalize(file));

    // 根据是否应该读取来确定文件内容
    let fileContent: string;
    if (
      !shouldReadFileContentsForSmartContext({
        filePath: file,
        normalizedRelativePath,
      })
    ) {
      fileContent = OMITTED_FILE_CONTENT;
    } else {
      const readContent = await readFileWithCache(file, virtualFileSystem);
      fileContent = readContent ?? "// Error reading file";
    }

    filesArray.push({
      path: normalizedRelativePath,
      content: fileContent,
      force: isForced,
    });

    return formattedContent;
  });

  const formattedFiles = await Promise.all(formatPromises);
  const formattedOutput = formattedFiles.join("");

  const endTime = Date.now();
  logger.log("extractCodebase: time taken", endTime - startTime);

  if (IS_TEST_BUILD) {
    filesArray.sort((a, b) => a.path.localeCompare(b.path));
  }

  return {
    formattedOutput,  // 用于发送给AI的格式化字符串
    files: filesArray, // 文件数组，包含原始内容
  };
}


/**
 * 按修改时间戳对文件进行排序（最旧的在前）
 * @param files - 文件路径数组
 * @returns Promise<string[]> - 排序后的文件路径数组
 */
async function sortFilesByModificationTime(files: string[]): Promise<string[]> {
  const fileStats = await Promise.all(
    files.map(async (file) => {
      try {
        const stats = await fsAsync.stat(file);
        return { file, mtime: stats.mtimeMs };
      } catch (error) {
        logger.warn(`Error getting file stats for ${file}:`, error);
        return { file, mtime: Date.now() };
      }
    }),
  );

  if (IS_TEST_BUILD) {
    return fileStats
      .sort((a, b) => a.file.localeCompare(b.file))
      .map((item) => item.file);
  }
  return fileStats.sort((a, b) => a.mtime - b.mtime).map((item) => item.file);
}

function createFullGlobPath({
  appPath,
  globPath,
}: {
  appPath: string;
  globPath: string;
}): string {
  return `${appPath.replace(/\\/g, "/")}/${globPath}`;
}
