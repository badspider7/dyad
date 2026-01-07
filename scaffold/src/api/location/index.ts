//库位相关接口

import { httpClient } from '@/utils/request';


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


interface StateResponse {
    label: string,
    value: number
}
/**
 * 获取所有的库位状态
 */
export const getAllLocationStates = async (): Promise<StateResponse[]> => {
    const response = await httpClient.get(`/location/states`);
    return response.data;
}

interface UpdateLocationBody {
    id: number;//库位id
    name: string; //库位名称
    code?: string;//库位编码
    state?: number; //库位状态
    is_disable?: boolean; //是否禁用
    area_name?: string;//库区名称
}
/**
 * 更新库位状态或相关信息
 */
export const updateLocationState = async (data: UpdateLocationBody): Promise<LocationItem> => {
    const response = await httpClient.post(`/location/update`, data);
    return response.data;
}