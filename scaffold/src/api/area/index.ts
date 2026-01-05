import { httpClient } from '@/utils/request';


interface Response<T> {
    status: number;
    code: number;
    msg: string;
    data: T;
}

interface PageParams {
    page: number;
    perPage: number;
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
    locations: LocationItem[]; //库位列表
}

interface LocationItem {
    id: number;
    created_at: string;
    updated_at: string;
    name: string; //库位的名称
    code: string; //库位的编码
    location_type: number; //库位类型
    is_disable: boolean; //是否禁用
    state: number; //库位状态
    last_state: number;
    order_code: string;
}

/**
 * 查询所有库区
 */
export const getAllAreas = async (params: PageParams): Promise<any[]> => {
    const response = await httpClient.get('/area/query', params);
    return response.data;
}


/**
 * 查询单个库区
 */
export const getArea = async (area_id: number): Promise<Response<AreaResponse>> => {
    const response = await httpClient.get(`/api/v1/areas/${area_id}`);
    return response.data;
}