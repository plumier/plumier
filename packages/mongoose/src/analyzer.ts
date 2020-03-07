import { Class } from "@plumier/core";
import { ModelStore } from ".";


function createAnalyzer(models: Map<Class, ModelStore>): () => void {
    return () => { }
}



export { createAnalyzer }