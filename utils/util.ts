export const getContract = (network: string = "testnet"): string => {
    switch (network.toLowerCase()) {
        case 'testnet':
        default:
            return 'CDPAEDELCWTQMZ4TOA767FC2NTLN6ZBC3V7LNH3IFTBMGFQQDFAOSYZQ';
    }
}

export const getIncrementContract = (network: string = "testnet"): string => {
    switch (network.toLowerCase()) {
        case 'testnet':
        default:
            return 'CAOSFIQ7QAHKUSQZW6OY3YJA6GJS2L7RJNOIC5X3D2WOA6OY3T6MKGLS';
    }
}

export const getRandContract = (network: string = "testnet"): string => {
    switch (network.toLowerCase()) {
        case 'testnet':
        default:
            return 'CDLQBWV77ZYL6RDEMOE5HYVANPL4QCL322HDP6LCCRRDCAQOXAIZHXCD';
    }
}

export const toObject = (obj: any) => {
    return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value, 4)
}