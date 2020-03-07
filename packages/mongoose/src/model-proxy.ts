
import Mongoose from "mongoose"




class ModelProxyHandler<T> implements ProxyHandler<Mongoose.Model<T & Mongoose.Document>> {

}