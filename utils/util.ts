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

export const getIncrementContract = async (network: string): Promise<string> => {
    switch (network.toLowerCase()) {
        case 'testnet':
            return 'CBSLYUH7FOTZBZSWZBEHOH7LZJV7YHT7OVNTBU4N7TVETGSO3W6C5T4F';
        case 'futurenet':
        default:
            return 'CANP33YCRUVX7B2XWUQIVZJ4RJJ7SI2IETNXKRGYB5VBQVKNXFJRBBG6';
    }
}

export const toObject = (obj: any) => {
    return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value, 4)
}