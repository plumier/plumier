import { GoogleProfile } from '@plumier/social-login'

import faker from "faker"

export async function axiosResult(data: any): Promise<{ data: any }> {
    return { data }
}

export function axiosError(error: any) {
    return { response: { data: error } }
}

export const googleProfile = <GoogleProfile>{
    family_name: faker.name.lastName(),
    given_name: faker.name.firstName(),
    id: faker.random.uuid(),
    locale: "en",
    name: faker.name.findName(),
    picture: faker.internet.url()
}