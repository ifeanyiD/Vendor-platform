import { API } from "../config/api";
import { useAuth } from "../context/AuthContext";

export const refreshToken = async ()=>{
    try {
        const { data } = await API.post("/auth/refresh");
        return data;
    } catch (error) {
        console.log(error);
        throw error;
    }finally{

    }
}