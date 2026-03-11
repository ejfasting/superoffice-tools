import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import type { DefinitionModel, ImplementationModel } from "../../src/generated/ast.js";
import { createCrmscriptServices } from "../../src/crmscript-module.js";

const serviceSet = createCrmscriptServices(EmptyFileSystem);

export const crmscriptServices = serviceSet;
export const parseDefinition = parseHelper<DefinitionModel>(serviceSet.Definition);
export const parseImplementation = parseHelper<ImplementationModel>(serviceSet.Implementation);
