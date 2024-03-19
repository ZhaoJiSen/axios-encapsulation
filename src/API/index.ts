import axios from "axios";

import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { LOGIN_URL } from "@/global.config";
import { ResultEnum } from "@/enums/httpEnum";
import { checkStatus } from "./helper/checkStatus";
import { AxiosCanceler } from "./helper/axiosCancel";
import { useUserStore } from "@/stores/modules/user";

import type { ResultData } from "./interface";
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";


const router = useRouter();
const axiosCanceler = new AxiosCanceler();

// 默认配置
const config = {
    // 默认请求地址，可以从 env 中获取
    baseURL: "http://localhost:8080",
    // 超时时间
    timeout: ResultEnum.TIMEOUT as number,
    // 跨域时允许携带凭证
    withCredentials: true,
}

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    loading?: boolean;
    cancel?: boolean;
}

class Request {
    service: AxiosInstance;

    public constructor(config: AxiosRequestConfig) {
        this.service = axios.create(config);

        /**
         * @description 请求拦截器
         * 客户端发送请求 -> [请求拦截器] -> 服务器
         * token校验(JWT) : 接受服务器返回的 token,存储到 vuex/pinia/本地储存当中
         */
        this.service.interceptors.request.use((config: CustomAxiosRequestConfig) => {
            // 通过 pinia 拿到 Token
            const userStore = useUserStore();

            // 重复请求不需要取消，在 api 服务中通过指定的第三个参数: { cancel: false } 来控制
            config.cancel ??= true
            config.cancel && axiosCanceler.addPending(config);

            // 当前请求不需要显示 loading，在 api 服务中通过指定的第三个参数: { loading: false } 来控制
            config.loading ??= true;
            // config.loading && showFullScreenLoading();

            if (config.headers && typeof config.headers.set === "function") {
                // 设置 token
                config.headers.set("x-access-token", userStore.token);
            }
            return config;

        }, (err: AxiosError) => {
            return Promise.reject(err);
        })

        /**
         * @description 响应拦截器
         *  服务器换返回信息 -> [拦截统一处理] -> 客户端JS获取到信息
         */
        this.service.interceptors.response.use((response: AxiosResponse & { config: CustomAxiosRequestConfig }) => {
            const { data, config } = response;

            const userStore = useUserStore();
            axiosCanceler.removePending(config);
            // config.loading && tryHideFullScreenLoading();

            // 登录失效
            if (data.code == ResultEnum.OVERDUE) {
                userStore.setToken("");
                router.replace(LOGIN_URL);
                ElMessage.error(data.msg);
                return Promise.reject(data);
            }

            // 全局错误信息拦截
            if (data.code && data.code !== ResultEnum.SUCCESS) {
                ElMessage.error(data.msg);
                return Promise.reject(data);
            }

            // 请求成功
            return data;
        }, async (err: AxiosError) => {
            const { response } = err;

            // 请求超时 && 网络错误单独判断，没有 response
            if (err.message.indexOf("timeout") !== -1) ElMessage.error("请求超时！请您稍后重试");
            if (err.message.indexOf("Network Error") !== -1) ElMessage.error("网络错误！请您稍后重试");

            // 根据服务器响应的错误状态码，做不同的处理
            if (response) checkStatus(response.status);
            return Promise.reject(err);
        })
    }

    /**
     * @description 常用请求方法封装
     */
    get<T>(url: string, params?: object, _object = {}): Promise<ResultData<T>> {
        return this.service.get(url, { params, ..._object });
    }
    post<T>(url: string, params?: object | string, _object = {}): Promise<ResultData<T>> {
        return this.service.post(url, params, _object);
    }
    put<T>(url: string, params?: object, _object = {}): Promise<ResultData<T>> {
        return this.service.put(url, params, _object);
    }
    delete<T>(url: string, params?: any, _object = {}): Promise<ResultData<T>> {
        return this.service.delete(url, { params, ..._object });
    }
    download(url: string, params?: object, _object = {}): Promise<BlobPart> {
        return this.service.post(url, params, { ..._object, responseType: "blob" });
    }
}


export default new Request(config);