import { FacebookProfile, GitHubProfile, GitLabProfile, GoogleProfile } from "@plumier/social-login"

export async function axiosResult(data: any): Promise<{ data: any }> {
    return { data }
}

export const fbProfile = <FacebookProfile>{
    email: "Josianne_Bosco@gmail.com",
    first_name: "Greta",
    id: "54f483f9-9b50-4c15-b53f-46ece9e3e5f8",
    last_name: "Erdman",
    name: "Manuel Auer",
    picture: {
        data: {
            url: "http://lorempixel.com/640/480",
        }
    }
}

export const googleProfile = <GoogleProfile>{
    email: "Josianne_Bosco@gmail.com",
    given_name: "Greta",
    id: "54f483f9-9b50-4c15-b53f-46ece9e3e5f8",
    family_name: "Erdman",
    name: "Manuel Auer",
    picture:  "http://lorempixel.com/640/480",
    locale: "en",
}

export const gitHubProfile = <GitHubProfile>{
    email: "Josianne_Bosco@gmail.com",
    id: 123456,
    name: "Manuel",
    avatar_url:  "http://lorempixel.com/640/480"
}

export const gitLabProfile = <GitLabProfile> {
    email: "Josianne_Bosco@gmail.com",
    id: 123456,
    name: "Manuel Auer",
    avatar_url:  "http://lorempixel.com/640/480"
}