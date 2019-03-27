
export namespace errorMessage {
    //PLUM1XXX User configuration error
    export const RouteDoesNotHaveBackingParam = "PLUM1000: Route parameters ({0}) doesn't have appropriate backing parameter"
    export const ActionDoesNotHaveTypeInfo = "PLUM1001: Parameter binding skipped because action doesn't have @route decorator"
    export const DuplicateRouteFound = "PLUM1003: Duplicate route found in {0}"
    export const ControllerPathNotFound = "PLUM1004: Controller file or directory {0} not found"
    export const ModelWithoutTypeInformation = "PLUM1005: Parameter binding skipped because  {0} doesn't have @domain() decorator"
    export const ArrayWithoutTypeInformation = "PLUM1006: Parameter binding skipped because array field without @array() decorator found in ({0})"
    export const ModelNotFound = "PLUM1007: Domain model not found, no class decorated with @domain() on provided classes"
    export const ModelPathNotFound = "PLUM1007: Domain model not found, no class decorated with @domain() on path {0}"
    export const PublicNotInParameter = "PLUM1008: @authorize.public() can not be applied to parameter"

    //PLUM2XXX internal app error
    export const UnableToInstantiateModel = `PLUM2000: Unable to instantiate {0}. Domain model should not throw error inside constructor`

    //End user error (no error code)
    export const UnableToConvertValue = `Unable to convert "{0}" into {1}`
    export const FileSizeExceeded = "File {0} size exceeded the maximum size"
    export const NumberOfFilesExceeded = "Number of files exceeded the maximum allowed"
}
