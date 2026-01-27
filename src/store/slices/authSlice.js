import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "../../services/auth.service";
import { STORAGE_KEYS } from "../../config/constants";
const initialState = {
    user: null,
    token: localStorage.getItem(STORAGE_KEYS.TOKEN),
    isAuthenticated: !!localStorage.getItem(STORAGE_KEYS.TOKEN),
    loading: false,
    error: null,
};
export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
    try {
        const response = await authService.login(credentials);
        if (!response.success && response.message) {
            return rejectWithValue(response.message);
        }
        return response.data;
    }
    catch (error) {
        return rejectWithValue(error.response?.data?.message || "Login failed");
    }
});
export const logout = createAsyncThunk("auth/logout", async () => {
    await authService.logout();
});
const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
            .addCase(login.fulfilled, (state, action) => {
            state.loading = false;
            state.isAuthenticated = true;
            if (action.payload) {
                state.user = action.payload.user;
                state.token = action.payload.token;
                localStorage.setItem(STORAGE_KEYS.TOKEN, action.payload.token);
            }
        })
            .addCase(login.rejected, (state, action) => {
            state.loading = false;
            state.isAuthenticated = false;
            state.error = action.payload;
        })
            .addCase(logout.fulfilled, (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
        });
    },
});
export const { clearError } = authSlice.actions;
export default authSlice.reducer;
