import { defineStore } from "pinia";
import type { UserState } from "../interface";
import piniaPersistConfig from "@/stores/helper/persist";

export const useUserStore = defineStore({
    id: "userStore",
    state: (): UserState => ({
        token: "",
        userInfo: { name: "ZhaoJiSen" }
    }),
    getters: {},
    actions: {
        // Set Token
        setToken(token: string) {
            this.token = token;
        },
        // Set setUserInfo
        setUserInfo(userInfo: UserState["userInfo"]) {
            this.userInfo = userInfo;
        }
    },
    persist: piniaPersistConfig("userStore")
});