import { scValToNative } from "soroban-client";

export const getContract = async (network: string): Promise<string> => {
    switch (network.toLowerCase()) {
        case 'testnet':
            return 'CDES3YLWWIWGMWAT4IHYUB3B4MNQMPHE3UYBMWDLONUOEY3VRNISEQHK';
        case 'futurenet':
        default:
            return 'CAEKJZUWNRUGTDINKFPYF5DVD5NIDJVROGL4A7P6KE6ZSH7SWIRGKZBM';
    }
}

export const toObject = (obj: any) => {
    return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value, 4)
}