export declare class AccessControlService {
    rolePermissions(roleId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        rolePermissions: {
            permission: {
                code: string;
                id: string;
                description: string | null;
            };
        }[];
    }>;
    replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<{
        id: string;
        name: string;
        description: string | null;
        rolePermissions: {
            permission: {
                code: string;
                id: string;
                description: string | null;
            };
        }[];
    }>;
}
