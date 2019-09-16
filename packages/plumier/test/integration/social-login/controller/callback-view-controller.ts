import {response, bind} from "@plumier/core"
import "@plumier/social-login"
import { oAuthCallback, GoogleProvider, GoogleLoginStatus } from '@plumier/social-login'
import { google } from '../config'


export class CallbackViewController {

    index(){
        return 
    }

    popup(){
        return response.callbackView({ message: "Lorem ipsum dolor" })
    }
}