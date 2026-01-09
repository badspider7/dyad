//库位相关接口

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

export interface LocationResponse {
    page: number;
    per_page: number;
    total: number;
    total_page: number;
    current_total: number;
    list: LocationItem[]
}

interface LocationItem {
    id: number; //库位id
    created_at: string;
    updated_at: string;
    area_name: string; //库区名称
    name: string; //库位的名称
    code: string; //库位的编码
    location_type: number; //库位类型
    is_disable: boolean; //是否禁用
    state: number; //库位状态
    warehouse_name: string; //仓库名称
    last_state: number; //上一次的库位状态
}

interface UpdateLocationBody {
    id: number;//库位id
    name: string; //库位名称
    code?: string;//库位编码
    state?: number; //库位状态
    is_disable?: boolean; //是否禁用
    area_name?: string;//库区名称,
    biz_code?: string; //业务相关编码，比如可以给库位绑定物料编码，用于区分库位上的物料
}

interface QueryLocationBody {
    area_name: string; //库区名称
    state?: number; //库位状态
}

interface CreateLocationBody {
    name: string; //库位名称
    code: string;//库位编码
    state: number; //库位状态,默认填1
    is_disable?: boolean; //是否禁用
    area_name: string;//库区名称,
    biz_code?: string; //业务相关编码，比如可以给库位绑定物料编码，用于区分库位上的物料
}

// 记得修改为正确的baseUrl
const baseURL = window.location.origin;

/**
 * 查询指定库区下的所有库位或指定状态的库位
 */
export const getAreaLocations = async (params: PageParams, data: QueryLocationBody): Promise<Response<LocationResponse>> => {
    const response = await httpClient.post(`/location/query`, data, { params, baseURL: `${baseURL}` });
    return response.data;
}


interface StateResponse {
    label: string,
    value: number
}
/**
 * 获取所有的库位状态
 */
export const getAllLocationStates = async (): Promise<StateResponse[]> => {
    const response = await httpClient.get(`/location/states`, { baseURL: `${baseURL}` });
    return response.data;
}


/**
 * 更新库位状态或相关信息
 */
export const updateLocationState = async (data: UpdateLocationBody): Promise<LocationItem> => {
    const response = await httpClient.post(`/location/update`, data, { baseURL: `${baseURL}` });
    return response.data;
}

/**
 * 删除库位
 */
export const deleteLocation = async (id: number): Promise<Response<LocationItem>> => {
    const response = await httpClient.post(`/location/delete`, { id: id }, { baseURL: `${baseURL}` });
    return response.data;
}


/**
 * 新增库位
 */
export const createLocation = async (data: CreateLocationBody): Promise<Response<LocationItem>> => {
    const response = await httpClient.post(`/location/create`, data, { baseURL: `${baseURL}` });
    return response.data;
}