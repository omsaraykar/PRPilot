import { usersService } from "./users.service";

export const usersController = {
    getUser(id: string) {
        return usersService.findById(id);
    },
};