//任务下发，小车信息，任务信息相关接口，调度8858接口

import { httpClient } from '@/utils/request';


// 接口采用HTTP RESTful规范，并做如下约定：
// 请求正确返回HTTP状态码2xx，请求失败返回4xx或5xx
// GET请求参数用url参数形式传人，POST请求参数用json内容传入
// 请求失败后返回的json错误体格式如下:
// {
//     "code": 500,
//      "msg": "这是发生错误的详细信息"
// }

interface MissionParams {
    ref_uuid?: string;  //创建任务时可选的任务uuid，必须唯一
    src?: string;  //创建任务时可选的任务来源
    req_robot?: number;  //创建任务时可指定机器人编号, 0表示不指定
    req_robgroups?: string;  //创建任务时可指定机器人分组,
    priority?: number;  // 创建任务时可指定任务优先级, 0-5, 5为最高
    steps: [   //创建任务时可指定任务步骤, 每个步骤包含以下字段:
        {
            target_code: string;  //地图中的点位别名
            action: string;  //任务步骤中到目标点之后要进行的动作, 来自Carly. 空表示没有动作
        }
    ]
}


interface MissionStep {
    map_name: string;  //地图名称
    target: number;  //点位id
    target_code: string; //点位id映射的点位别名，便于人类理解
    action: string; //任务步骤中到目标点之后要进行的动作, 来自Carly. 空表示到点不执行动作
    args: string; //动作的参数
    state: number; //当前任务的状态，任务状态编号 0:排队中, 1:执行中,4:取消中, 5:正常完成, 6:取消完成, 7:出错完成，8：重置完成， 2，3暂时没有，都属于1的执行中. 
    is_load: boolean; // 小车是否载货
}

interface MissionR {
    ref_uuid: string;
    src: string;
    description: string;
    steps: MissionStep[];
    req_robot: number;
    req_robgroups: string;
    priority: number;
    material_id: string;
    type: number;
    req_carrier_type: string;
    params: null;
    id: number;  //当前任务在数据库中的id，唯一
    create_stamp: number;
    finish_stamp: number;
}


interface RobotInfo {
    id: number; //小车id，唯一i
    alias: string;//小车别名
    run_state: number;//小车运行状态
    run_state_str: string;//小车运行状态描述
    nav_state: number;//小车导航状态
    nav_state_str: string;//小车导航状态描述
    mission_id: number; //任务id，当前任务在数据库中的id，唯一
    mission_state: number;//任务状态
    mission_err_msg: string;//任务错误信息
    last_spot_id: number;//最后一个点位id
    next_spot_id: number;//下一个点位id
    last_spot_name: string;//最后一个点位名称
    next_spot_name: string;//下一个点位名称
    name: string;//小车名称
    run_state_detail: string;//小车运行状态详情
    sched_mode: boolean;//小车是否是调度模式
    nearest_station: string;//最近站点
    mission_err_code: number;
    update_stamp: number; //
    map_name: string;//小车所在的地图名称
    total_mileage: number;
    stop_btn: boolean; //是否按下暂停按钮
    battery: number;//小车的电量
    loading: boolean; //是否在载货状态
    nomove_seconds: number; //没移动秒数
    nomove_reason: string; //没移动原因
    multi_loadings: any[]; //多载状态
    lifting: boolean; //是否在提升状态
    offtrack: boolean; //是否偏离轨道
    stop_soft: boolean; //是否软停止
    is_locked: boolean; //是否锁定
}

interface MissionCommand {
    mission_id: number, // 任务编号, 为0时会按mission_uuid来查找任务
    mission_uuid: string, // 任务uuid, 下任务时指定的
    cmd: 2, // 任务指令, 目前只支持2:取消
    sync: boolean, // 是否需要同步等待, 正常指令是异步的, true的话会等10s看是否完成
}

interface MissionCommandResult {
    result: number, // 执行结果, 0:等待中, 1:成功完成, 2:出错
    err_msg: string, // 执行出错原因
}

/**
 * 创建任务
 * 
 * 如果是必选的参数，则不能为空，可选的参数用户没有指定说明也不用自己填入，直接调用即可
 * 
 * EXAMPLE:
 * {
 *     src: 'system',
 *     steps: [{ target_code: 'cabinet-A1', action: 'load' },{ target_code: 'cabinet-A2', action: 'unload' }]
 * }
 */
export const sendMission = async (task: MissionParams): Promise<MissionR> => {
    const response = await httpClient.post('/api/v1/missions', task);
    return response.data;
}


/**
 * 获取单台小车信息
 */
export const getRobotInfo = async (robot_id: number): Promise<RobotInfo> => {
    const response = await httpClient.get(`/api/v1/robots/${robot_id}`);
    return response.data;
}

/**
 * 获取全部小车的信息
 */
export const getallRobotInfo = async (): Promise<RobotInfo[]> => {
    const response = await httpClient.get(`/api/v1/robots`);
    return response.data;
}


/**
 * 取消任务
 */
export const cancelMission = async (MissionCommand: MissionCommand): Promise<MissionCommandResult> => {
    const response = await httpClient.post(`/api/v1/mscmds`, MissionCommand);
    return response.data;
}

interface MissionListParams {
    offset: number;//默认是0
    limit: number;//默认是20
    status?: string;//不传则返回所有状态的任务，running 是进行中，canceled是已取消，pending是待分配，finished 是已完成，error是出错，reset是重置完成
}

interface MissionListResponse {
    err: number;//0为成功，其他为失败
    msg: string;//错误信息
    data: {
        count: number;//总任务数
        missions: MissionR[];//任务列表
    }
}
/**
 * 获取所有的任务信息,这个接口的baseUrl 端口必须使用 9000
 */
export const getAllMissions = async (params: MissionListParams): Promise<MissionListResponse> => {
    const header = {
        "Authorization": "Basic cm9vdDplMTBhZGMzOTQ5YmE1OWFiYmU1NmUwNTdmMjBmODgzZQ=="
    }
    const response = await httpClient.get(`/missions`, { params, headers: header });
    return response.data;
}