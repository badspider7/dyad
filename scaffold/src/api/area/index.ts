//库区相关接口

import { httpClient } from '@/utils/request';

interface Response<T> {
    status: number;
    code: number;
    msg: string;
    data: T;
}

interface PageParams {
    page: number; //默认为1
    perPage: number; //默认为100
}

interface AreaResponse {
    page: number;
    per_page: number;
    total: number;
    total_page: number;
    current_total: number;
    list: AreaItem[]
}

interface AreaItem {
    id: number;
    created_at: string;
    updated_at: string;
    name: string; //库区的名称
    code: string; //库区的编码
    is_disable: boolean; //是否禁用
    state: number; //库区状态
    warehouse_name: string//仓库名称
}



interface AreaBody {
    name: string;  //库区名称
    code: string;  //库区编码
    warehouse_name?: string; //仓库名称
}

/**
 * 查询所有库区或指定库区
 */
export const getAllAreas = async (params: PageParams, data: AreaBody): Promise<Response<AreaResponse>> => {
    const response = await httpClient.post('/area/query', data, { params });
    return response.data;
}


/**
 * 删除库区
 */
export const deleteArea = async (id: number): Promise<Response<AreaItem>> => {
    const response = await httpClient.post(`/area/delete`, { id: id });
    return response.data;
}



interface updateAreaBody {
    id: number;//库区信息中返回的id
    code: number; //库区编码
    name: string; //库区名称
    is_disable?: boolean; //是否禁用
    warehouse_name?: string;//仓库名称
}
/**
 * 更新库区信息
 */
export const updateArea = async (data: updateAreaBody): Promise<Response<AreaItem>> => {
    const response = await httpClient.post(`/area/update`, data);
    return response.data;
}


/**
 * 创建库区
 */
export const createArea = async (data: AreaBody): Promise<Response<AreaItem>> => {
    const response = await httpClient.post(`/area/create`, data);
    return response.data;
}