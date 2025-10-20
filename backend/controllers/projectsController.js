import { updateProjectTimeEntries } from "../services/projectsService.js";

export const updateTimeEntries = async (req, res, next) => {
    try {
        const params = req.validatedParams ?? req.params ?? {};
        const body = req.validatedBody ?? req.body ?? {};
        const result = await updateProjectTimeEntries({ ...params, ...body }, req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
