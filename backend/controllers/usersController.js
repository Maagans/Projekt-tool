import { listUsers, updateUserRole } from "../services/usersService.js";

const assertAdmin = (user) => {
    if (user?.role !== "Administrator") {
        throw Object.assign(new Error("Forbidden: Administrator access required."), {
            status: 403,
            userMessage: "Forbidden: Administrator access required.",
        });
    }
};

export const getUsers = async (req, res, next) => {
    try {
        assertAdmin(req.user);
        const users = await listUsers();
        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const changeUserRole = async (req, res, next) => {
    try {
        assertAdmin(req.user);
        const { id } = req.validatedParams ?? req.params;
        const { role } = req.validatedBody ?? req.body ?? {};
        const result = await updateUserRole(id, role, req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
