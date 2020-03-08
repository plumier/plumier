import { Class, printTable, consoleLog } from "@plumier/core";
import { ModelStore, AnalysisResult } from './types';
import { inspect } from "util"

function createAnalyzer(models: Map<Class, ModelStore>) {
    return (): AnalysisResult[] => {
        return Array.from(models.entries()).map(([Type, { name, collectionName, definition, option }]) => {
            return {
                typeName: Type.name, name,
                collection: `db.${collectionName}`,
                option: inspect(option, { breakLength: Infinity }),
                definition: inspect(definition, { breakLength: Infinity })
            }
        })
    }
}

function printAnalysis(result: AnalysisResult[]) {
    printTable(["typeName", { property: x => "->" }, "name", "collection"], result, {
        onPrintRow: (x, y) => {
            if (y.option.toString() === "{}")
                return x
            else
                return `${x}\n${y.option}`
        }
    })
}

export { createAnalyzer, printAnalysis }