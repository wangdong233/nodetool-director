/**
 * Code Snippets — ready-to-use patterns for the Code node.
 *
 * These replace the removed pure-JS wrapper nodes (boolean, math, text, list,
 * dictionary, date, uuid, http, json) and add streaming patterns.
 * Entirely frontend — no backend dependency.
 */

export type SnippetCategory =
  | "Boolean & Logic"
  | "Math"
  | "Text"
  | "Regex"
  | "List"
  | "Dictionary"
  | "Date & Time"
  | "UUID"
  | "JSON"
  | "Streaming"
  | "Path"
  | "Files"
  | "SVG"
  | "HTTP"
  | "Markdown"
  | "HTML"
  | "Validation"
  | "Email"
  | "Image";

/**
 * Type declaration for one snippet input slot.
 *
 * `type` is a NodeTool type name the editor knows — see
 * `config/data_types.ts` for the handle-colour registry and
 * `components/node/PropertyInput.resolver.tsx` for the editor a type resolves
 * to (`color` and `svg_element` live only in the latter).
 */
interface SnippetInputDeclaration {
  type: string;
  default?: unknown;
  description?: string;
  /** i18n key under catalog:snippets.* — resolves `description` at render. */
  descriptionKey?: string;
  min?: number;
  max?: number;
}

export interface CodeSnippet {
  id: string;
  title: string;
  /** i18n key under catalog:snippets.* — resolves `title` at render. */
  titleKey?: string;
  description: string;
  /** i18n key under catalog:snippets.* — resolves `description` at render. */
  descriptionKey?: string;
  category: SnippetCategory;
  code: string;
  tags: string[];
  /**
   * Per-input types, keyed by the input name the code references. Optional:
   * any input left undeclared falls back to the category default. Names that
   * the code does not reference are ignored (an authoring error — the
   * `codeSnippets` test pins that every declared name is inferred).
   */
  inputs?: Record<string, SnippetInputDeclaration>;
  /** Per-output types, keyed by the key of the returned object literal. */
  outputs?: Record<string, string>;
}

export const SNIPPET_CATEGORIES: SnippetCategory[] = [
  "Boolean & Logic",
  "Math",
  "Text",
  "Regex",
  "List",
  "Dictionary",
  "Date & Time",
  "UUID",
  "JSON",
  "Streaming",
  "Path",
  "Files",
  "SVG",
  "HTTP",
  "Markdown",
  "HTML",
  "Validation",
  "Email",
  "Image"
];

export const CODE_SNIPPETS: CodeSnippet[] = [
  // ---------------------------------------------------------------------------
  // Boolean & Logic
  // ---------------------------------------------------------------------------
  {
    id: "bool-conditional",
    title: "Conditional Switch",
    titleKey: "conditionalSwitch",
    description: "Return one of two values based on a condition",
    descriptionKey: "returnOneOfTwoValuesBasedOnACondition",
    category: "Boolean & Logic",
    code: "return { output: inputs.condition ? inputs.if_true : inputs.if_false };",
    tags: ["conditional", "switch", "ternary", "if", "else"]
  },
  {
    id: "bool-and",
    title: "Logical AND",
    titleKey: "logicalAND",
    description: "Logical AND of two booleans",
    descriptionKey: "logicalANDOfTwoBooleans",
    category: "Boolean & Logic",
    code: "return { output: inputs.a && inputs.b };",
    tags: ["and", "logical", "&&"]
  },
  {
    id: "bool-or",
    title: "Logical OR",
    titleKey: "logicalOR",
    description: "Logical OR of two booleans",
    descriptionKey: "logicalOROfTwoBooleans",
    category: "Boolean & Logic",
    code: "return { output: inputs.a || inputs.b };",
    tags: ["or", "logical", "||"]
  },
  {
    id: "bool-not",
    title: "Not",
    titleKey: "not",
    description: "Negate a boolean value",
    descriptionKey: "negateABooleanValue",
    category: "Boolean & Logic",
    code: "return { output: !inputs.value };",
    tags: ["not", "negate", "invert", "!"]
  },
  {
    id: "bool-compare",
    title: "Compare",
    titleKey: "compare",
    description: "Compare two values (==, !=, >, <, >=, <=)",
    descriptionKey: "compareTwoValues",
    category: "Boolean & Logic",
    code: `// Change the operator as needed: ==, !=, >, <, >=, <=
return { output: inputs.a > inputs.b };`,
    tags: ["compare", "equal", "greater", "less", "operator"]
  },
  {
    id: "bool-is-none",
    title: "Is None",
    titleKey: "isNone",
    description: "Check if a value is null or undefined",
    descriptionKey: "checkIfAValueIsNullOrUndefined",
    category: "Boolean & Logic",
    code: "return { output: inputs.value === null || inputs.value === undefined };",
    tags: ["none", "null", "undefined", "empty", "check"]
  },
  {
    id: "bool-is-in",
    title: "Is In",
    titleKey: "isIn",
    description: "Check if a value is in a list",
    descriptionKey: "checkIfAValueIsInAList",
    category: "Boolean & Logic",
    code: "return { output: inputs.list.includes(inputs.value) };",
    tags: ["in", "includes", "contains", "member"]
  },
  {
    id: "bool-all",
    title: "All",
    description: "Check if all values are truthy",
    descriptionKey: "checkIfAllValuesAreTruthy",
    category: "Boolean & Logic",
    code: "return { output: inputs.values.every(Boolean) };",
    tags: ["all", "every", "truthy"]
  },
  {
    id: "bool-some",
    title: "Some",
    titleKey: "some",
    description: "Check if any value is truthy",
    descriptionKey: "checkIfAnyValueIsTruthy",
    category: "Boolean & Logic",
    code: "return { output: inputs.values.some(Boolean) };",
    tags: ["some", "any", "truthy"]
  },

  // ---------------------------------------------------------------------------
  // Math
  // ---------------------------------------------------------------------------
  {
    id: "math-add",
    title: "Add",
    description: "Add two numbers",
    descriptionKey: "addTwoNumbers",
    category: "Math",
    code: "return { output: inputs.a + inputs.b };",
    tags: ["add", "plus", "sum", "+"]
  },
  {
    id: "math-subtract",
    title: "Subtract",
    titleKey: "subtract",
    description: "Subtract b from a",
    descriptionKey: "subtractBFromA",
    category: "Math",
    code: "return { output: inputs.a - inputs.b };",
    tags: ["subtract", "minus", "difference", "-"]
  },
  {
    id: "math-multiply",
    title: "Multiply",
    description: "Multiply two numbers",
    descriptionKey: "multiplyTwoNumbers",
    category: "Math",
    code: "return { output: inputs.a * inputs.b };",
    tags: ["multiply", "product", "times", "*"]
  },
  {
    id: "math-divide",
    title: "Divide",
    titleKey: "divide",
    description: "Divide a by b",
    descriptionKey: "divideAByB",
    category: "Math",
    code: "return { output: inputs.a / inputs.b };",
    tags: ["divide", "quotient", "/"]
  },
  {
    id: "math-modulus",
    title: "Modulus",
    titleKey: "modulus",
    description: "Remainder of a divided by b",
    descriptionKey: "remainderOfADividedByB",
    category: "Math",
    code: "return { output: inputs.a % inputs.b };",
    tags: ["modulus", "remainder", "mod", "%"]
  },
  {
    id: "math-power",
    title: "Power",
    titleKey: "power",
    description: "Raise base to the power of exponent",
    descriptionKey: "raiseBaseToThePowerOfExponent",
    category: "Math",
    code: "return { output: Math.pow(inputs.base, inputs.exponent) };",
    tags: ["power", "exponent", "pow", "**"]
  },
  {
    id: "math-sqrt",
    title: "Square Root",
    titleKey: "squareRoot",
    description: "Calculate the square root",
    descriptionKey: "calculateTheSquareRoot",
    category: "Math",
    code: "return { output: Math.sqrt(inputs.value) };",
    tags: ["sqrt", "square root", "root"]
  },
  {
    id: "math-abs",
    title: "Absolute Value",
    titleKey: "absoluteValue",
    description: "Get the absolute value",
    descriptionKey: "getTheAbsoluteValue",
    category: "Math",
    code: "return { output: Math.abs(inputs.value) };",
    tags: ["abs", "absolute"]
  },
  {
    id: "math-round",
    title: "Round",
    description: "Round to nearest integer (or to decimal places)",
    descriptionKey: "roundToNearestIntegerOrToDecimalPlaces",
    category: "Math",
    code: `// Round to N decimal places (0 for integer)
const places = 0;
return { output: Math.round(inputs.value * 10**places) / 10**places };`,
    tags: ["round", "ceil", "floor", "decimal"]
  },
  {
    id: "math-min-max",
    title: "Min / Max",
    titleKey: "minMax",
    description: "Find the minimum or maximum of values",
    descriptionKey: "findTheMinimumOrMaximumOfValues",
    category: "Math",
    code: `return {
  min: Math.min(inputs.a, inputs.b),
  max: Math.max(inputs.a, inputs.b)
};`,
    tags: ["min", "max", "minimum", "maximum", "clamp"]
  },
  {
    id: "math-clamp",
    title: "Clamp",
    titleKey: "clamp",
    description: "Clamp a value between min and max",
    descriptionKey: "clampAValueBetweenMinAndMax",
    category: "Math",
    code: "return { output: Math.min(Math.max(inputs.value, inputs.min), inputs.max) };",
    tags: ["clamp", "constrain", "limit", "bound"]
  },
  {
    id: "math-trig",
    title: "Trigonometry",
    titleKey: "trigonometry",
    description: "sin, cos, tan and their inverses",
    descriptionKey: "sinCosTanAndTheirInverses",
    category: "Math",
    code: `return {
  sin: Math.sin(inputs.angle),
  cos: Math.cos(inputs.angle),
  tan: Math.tan(inputs.angle)
};`,
    tags: ["sin", "cos", "tan", "trig", "angle", "radians"]
  },
  {
    id: "math-random",
    title: "Random Number",
    titleKey: "randomNumber",
    description: "Generate a random number in a range",
    descriptionKey: "generateARandomNumberInARange",
    category: "Math",
    code: `const min = 0, max = 100;
return { output: Math.random() * (max - min) + min };`,
    tags: ["random", "rand", "number"]
  },

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------
  {
    id: "text-join",
    title: "Join Array",
    titleKey: "joinArray",
    description: "Join array of strings with a separator",
    descriptionKey: "joinArrayOfStringsWithASeparator",
    category: "Text",
    code: `return { output: inputs.items.join(", ") };`,
    tags: ["join", "implode", "separator", "array"]
  },
  {
    id: "text-replace",
    title: "Replace",
    description: "Replace all occurrences of a substring",
    descriptionKey: "replaceAllOccurrencesOfASubstring",
    category: "Text",
    code: `return { output: inputs.text.replaceAll(inputs.search, inputs.replacement) };`,
    tags: ["replace", "substitute", "swap"]
  },
  {
    id: "text-split",
    title: "Split",
    titleKey: "split",
    description: "Split a string into an array",
    descriptionKey: "splitAStringIntoAnArray",
    category: "Text",
    code: `return { output: inputs.text.split(", ") };`,
    tags: ["split", "explode", "tokenize", "array"]
  },
  {
    id: "text-upper-lower",
    title: "Upper / Lower Case",
    titleKey: "upperLowerCase",
    description: "Convert text to upper or lower case",
    descriptionKey: "convertTextToUpperOrLowerCase",
    category: "Text",
    code: `return {
  upper: inputs.text.toUpperCase(),
  lower: inputs.text.toLowerCase()
};`,
    tags: ["upper", "lower", "case", "capitalize", "uppercase", "lowercase"]
  },
  {
    id: "text-trim",
    title: "Trim",
    titleKey: "trim",
    description: "Remove whitespace from start and end",
    descriptionKey: "removeWhitespaceFromStartAndEnd",
    category: "Text",
    code: "return { output: inputs.text.trim() };",
    tags: ["trim", "strip", "whitespace"]
  },
  {
    id: "text-template",
    title: "Template String",
    titleKey: "templateString",
    description: "Format a string with variables",
    descriptionKey: "formatAStringWithVariables",
    category: "Text",
    code: "return { output: `Hello ${inputs.name}, you have ${inputs.count} items.` };",
    tags: ["template", "format", "interpolate", "string"]
  },
  {
    id: "text-regex",
    title: "Regex Match",
    titleKey: "regexMatch",
    description: "Match text against a regular expression",
    descriptionKey: "matchTextAgainstARegularExpression",
    category: "Text",
    code: `const matches = inputs.text.match(/pattern/g) || [];
return { output: matches, found: matches.length > 0 };`,
    tags: ["regex", "match", "pattern", "regular expression", "search"]
  },
  {
    id: "text-to-string",
    title: "To String",
    titleKey: "toString",
    description: "Convert any value to a string representation",
    descriptionKey: "convertAnyValueToAStringRepresentation",
    category: "Text",
    code: "return { output: JSON.stringify(inputs.value, null, 2) };",
    tags: ["toString", "stringify", "convert", "repr", "cast"]
  },
  {
    id: "text-pad",
    title: "Pad String",
    titleKey: "padString",
    description: "Pad a string to a fixed length",
    descriptionKey: "padAStringToAFixedLength",
    category: "Text",
    code: `return {
  padStart: String(inputs.value).padStart(inputs.length, "0"),
  padEnd: String(inputs.value).padEnd(inputs.length, " ")
};`,
    tags: ["pad", "padding", "fixed", "width"]
  },

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------
  {
    id: "list-length",
    title: "List Length",
    titleKey: "listLength",
    description: "Get the number of items in a list",
    descriptionKey: "getTheNumberOfItemsInAList",
    category: "List",
    code: "return { output: inputs.list.length };",
    tags: ["length", "count", "size"]
  },
  {
    id: "list-get",
    title: "Get Element",
    titleKey: "getElement",
    description: "Get an element by index (supports negative indexing)",
    descriptionKey: "getAnElementByIndexSupportsNegativeIndexing",
    category: "List",
    code: `const i = inputs.index < 0 ? inputs.list.length + inputs.index : inputs.index;
return { output: inputs.list[i] };`,
    tags: ["get", "index", "element", "access", "at"]
  },
  {
    id: "list-append",
    title: "Append",
    description: "Add an item to the end of a list",
    descriptionKey: "addAnItemToTheEndOfAList",
    category: "List",
    code: "return { output: [...inputs.list, inputs.item] };",
    tags: ["append", "push", "add"]
  },
  {
    id: "list-extend",
    title: "Extend / Merge",
    titleKey: "extendMerge",
    description: "Combine two lists",
    descriptionKey: "combineTwoLists",
    category: "List",
    code: "return { output: [...inputs.a, ...inputs.b] };",
    tags: ["extend", "merge", "combine", "concat"]
  },
  {
    id: "list-slice",
    title: "Slice",
    titleKey: "slice",
    description: "Extract a portion of a list",
    descriptionKey: "extractAPortionOfAList",
    category: "List",
    code: "return { output: inputs.list.slice(inputs.start, inputs.end) };",
    tags: ["slice", "substring", "subarray", "range"]
  },
  {
    id: "list-filter",
    title: "Filter",
    description: "Filter items matching a condition",
    descriptionKey: "filterItemsMatchingACondition",
    category: "List",
    code: "return { output: inputs.items.filter(x => x > inputs.threshold) };",
    tags: ["filter", "select", "where", "condition"]
  },
  {
    id: "list-map",
    title: "Map / Transform",
    titleKey: "mapTransform",
    description: "Transform each item in a list",
    descriptionKey: "transformEachItemInAList",
    category: "List",
    code: "return { output: inputs.items.map(x => x * 2) };",
    tags: ["map", "transform", "each", "apply"]
  },
  {
    id: "list-sort",
    title: "Sort",
    titleKey: "sort",
    description: "Sort a list (ascending or custom)",
    descriptionKey: "sortAListAscendingOrCustom",
    category: "List",
    code: `// Ascending number sort; for strings use: [...list].sort()
return { output: [...inputs.list].sort((a, b) => a - b) };`,
    tags: ["sort", "order", "ascending", "descending"]
  },
  {
    id: "list-reverse",
    title: "Reverse",
    titleKey: "reverse",
    description: "Reverse the order of a list",
    descriptionKey: "reverseTheOrderOfAList",
    category: "List",
    code: "return { output: [...inputs.list].reverse() };",
    tags: ["reverse", "flip"]
  },
  {
    id: "list-unique",
    title: "Unique / Dedupe",
    titleKey: "uniqueDedupe",
    description: "Remove duplicate values",
    descriptionKey: "removeDuplicateValues",
    category: "List",
    code: "return { output: [...new Set(inputs.list)] };",
    tags: ["unique", "dedupe", "distinct", "set"]
  },
  {
    id: "list-flatten",
    title: "Flatten",
    titleKey: "flatten",
    description: "Flatten nested arrays",
    descriptionKey: "flattenNestedArrays",
    category: "List",
    code: `// depth: Infinity for full flatten, or a number
return { output: inputs.list.flat(Infinity) };`,
    tags: ["flatten", "flat", "nested", "depth"]
  },
  {
    id: "list-chunk",
    title: "Chunk",
    titleKey: "chunk",
    description: "Split a list into chunks of a given size",
    descriptionKey: "splitAListIntoChunksOfAGivenSize",
    category: "List",
    code: `const chunks = [];
for (let i = 0; i < inputs.list.length; i += inputs.size) {
  chunks.push(inputs.list.slice(i, i + inputs.size));
}
return { output: chunks };`,
    tags: ["chunk", "batch", "partition", "group"]
  },
  {
    id: "list-sum",
    title: "Sum",
    titleKey: "sum",
    description: "Sum all numbers in a list",
    descriptionKey: "sumAllNumbersInAList",
    category: "List",
    code: "return { output: inputs.list.reduce((a, b) => a + b, 0) };",
    tags: ["sum", "total", "add"]
  },
  {
    id: "list-average",
    title: "Average",
    titleKey: "average",
    description: "Calculate the average of a list",
    descriptionKey: "calculateTheAverageOfAList",
    category: "List",
    code: `return { output: inputs.list.reduce((a, b) => a + b, 0) / inputs.list.length };`,
    tags: ["average", "mean", "avg"]
  },
  {
    id: "list-min-max",
    title: "List Min / Max",
    titleKey: "listMinMax",
    description: "Find the minimum and maximum values in a list",
    descriptionKey: "findTheMinimumAndMaximumValuesInAList",
    category: "List",
    code: `return {
  min: Math.min(...inputs.list),
  max: Math.max(...inputs.list)
};`,
    tags: ["min", "max", "minimum", "maximum"]
  },
  {
    id: "list-range",
    title: "Range",
    description: "Generate a list of numbers",
    descriptionKey: "generateAListOfNumbers",
    category: "List",
    code: `const start = 0, end = 10, step = 1;
const result = [];
for (let i = start; i < end; i += step) result.push(i);
return { output: result };`,
    tags: ["range", "sequence", "generate", "numbers"]
  },
  {
    id: "list-shuffle",
    title: "Shuffle",
    titleKey: "shuffle",
    description: "Randomly shuffle a list (Fisher-Yates)",
    descriptionKey: "randomlyShuffleAListFisherYates",
    category: "List",
    code: `const arr = [...inputs.list];
for (let i = arr.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
return { output: arr };`,
    tags: ["shuffle", "random", "randomize"]
  },
  {
    id: "list-intersection",
    title: "Intersection",
    titleKey: "intersection",
    description: "Find common elements between two lists",
    descriptionKey: "findCommonElementsBetweenTwoLists",
    category: "List",
    code: `const setB = new Set(inputs.b);
return { output: inputs.a.filter(x => setB.has(x)) };`,
    tags: ["intersection", "common", "shared", "overlap"]
  },
  {
    id: "list-union",
    title: "Union",
    titleKey: "union",
    description: "Combine two lists, removing duplicates",
    descriptionKey: "combineTwoListsRemovingDuplicates",
    category: "List",
    code: "return { output: [...new Set([...inputs.a, ...inputs.b])] };",
    tags: ["union", "merge", "combine", "unique"]
  },
  {
    id: "list-difference",
    title: "Difference",
    description: "Find elements in a that are not in b",
    descriptionKey: "findElementsInAThatAreNotInB",
    category: "List",
    code: `const setB = new Set(inputs.b);
return { output: inputs.a.filter(x => !setB.has(x)) };`,
    tags: ["difference", "subtract", "exclude", "except"]
  },
  {
    id: "list-group-by",
    title: "Group By",
    titleKey: "groupBy",
    description: "Group items by a key",
    descriptionKey: "groupItemsByAKey",
    category: "List",
    code: `const groups = {};
for (const item of inputs.items) {
  const k = item[inputs.key];
  (groups[k] ||= []).push(item);
}
return { output: groups };`,
    tags: ["group", "groupBy", "categorize", "bucket"]
  },
  {
    id: "list-reduce",
    title: "Reduce",
    titleKey: "reduce",
    description: "Reduce a list to a single value",
    descriptionKey: "reduceAListToASingleValue",
    category: "List",
    code: `return { output: inputs.list.reduce((acc, item) => acc + item, 0) };`,
    tags: ["reduce", "fold", "accumulate", "aggregate"]
  },
  {
    id: "list-repeat-each",
    title: "Repeat Each Item",
    titleKey: "repeatEachItem",
    description:
      "Repeat each list item consecutively N times: [A,B] x 2 → [A,A,B,B]",
    category: "List",
    code: `const times = 2;
return { output: inputs.list.flatMap(item => Array(times).fill(item)) };`,
    tags: ["repeat", "each", "duplicate", "interleave", "expand", "multiply"]
  },
  {
    id: "list-repeat-value",
    title: "Repeat Value",
    titleKey: "repeatValue",
    description: "Duplicate a single value into a list N times",
    descriptionKey: "duplicateASingleValueIntoAListNTimes",
    category: "List",
    code: `const times = 3;
return { output: Array(times).fill(inputs.value) };`,
    tags: ["repeat", "duplicate", "fill", "scalar", "constant", "expand"]
  },
  {
    id: "list-tile",
    title: "Tile List",
    titleKey: "tileList",
    description:
      "Repeat an entire list end-to-end N times: [A,B] x 2 → [A,B,A,B]",
    category: "List",
    code: `const times = 3;
const output = [];
for (let t = 0; t < times; t++) output.push(...inputs.list);
return { output };`,
    tags: ["tile", "repeat", "cycle", "loop", "concatenate", "duplicate"]
  },

  // ---------------------------------------------------------------------------
  // Dictionary
  // ---------------------------------------------------------------------------
  {
    id: "dict-get",
    title: "Get Value",
    titleKey: "getValue",
    description:
      "Get a value from a dictionary by key (supports dot paths like 'a.b.c')",
    category: "Dictionary",
    code: `const value = String(inputs.key).split(".").reduce(
  (acc, k) => (acc == null ? acc : acc[k]),
  inputs.dict
);
return { output: value };`,
    tags: ["get", "access", "key", "value", "path"]
  },
  {
    id: "dict-set",
    title: "Set / Update",
    titleKey: "setUpdate",
    description: "Set or update a key in a dictionary",
    descriptionKey: "setOrUpdateAKeyInADictionary",
    category: "Dictionary",
    code: "return { output: { ...inputs.dict, [inputs.key]: inputs.value } };",
    tags: ["set", "update", "put", "assign"]
  },
  {
    id: "dict-remove",
    title: "Remove Key",
    titleKey: "removeKey",
    description: "Remove a key from a dictionary",
    descriptionKey: "removeAKeyFromADictionary",
    category: "Dictionary",
    code: `const { [inputs.key]: _, ...rest } = inputs.dict;
return { output: rest };`,
    tags: ["remove", "delete", "omit", "key"]
  },
  {
    id: "dict-keys-values",
    title: "Keys / Values",
    titleKey: "keysValues",
    description: "Get all keys or values from a dictionary",
    descriptionKey: "getAllKeysOrValuesFromADictionary",
    category: "Dictionary",
    code: `return {
  keys: Object.keys(inputs.dict),
  values: Object.values(inputs.dict)
};`,
    tags: ["keys", "values", "entries"]
  },
  {
    id: "dict-merge",
    title: "Merge Dictionaries",
    titleKey: "mergeDictionaries",
    description: "Merge two or more dictionaries",
    descriptionKey: "mergeTwoOrMoreDictionaries",
    category: "Dictionary",
    code: "return { output: { ...inputs.a, ...inputs.b } };",
    tags: ["merge", "combine", "spread", "assign"]
  },
  {
    id: "dict-filter",
    title: "Filter Dictionary",
    titleKey: "filterDictionary",
    description: "Filter entries by a condition",
    descriptionKey: "filterEntriesByACondition",
    category: "Dictionary",
    code: `return { output: Object.fromEntries(
  Object.entries(inputs.dict).filter(([k, v]) => v !== null)
) };`,
    tags: ["filter", "select", "where"]
  },
  {
    id: "dict-zip",
    title: "Zip Keys & Values",
    titleKey: "zipKeysValues",
    description: "Create a dictionary from parallel key and value arrays",
    descriptionKey: "createADictionaryFromParallelKeyAndValueArrays",
    category: "Dictionary",
    code: `return { output: Object.fromEntries(
  inputs.keys.map((k, i) => [k, inputs.values[i]])
) };`,
    tags: ["zip", "fromEntries", "create", "build"]
  },
  {
    id: "dict-pick",
    title: "Pick Keys",
    titleKey: "pickKeys",
    description: "Select specific keys from a dictionary",
    descriptionKey: "selectSpecificKeysFromADictionary",
    category: "Dictionary",
    code: `const picked = ['key1', 'key2'];
return { output: Object.fromEntries(
  Object.entries(inputs.dict).filter(([k]) => picked.includes(k))
) };`,
    tags: ["pick", "select", "subset", "pluck"]
  },
  {
    id: "dict-omit",
    title: "Omit Keys",
    titleKey: "omitKeys",
    description: "Remove specific keys from a dictionary",
    descriptionKey: "removeSpecificKeysFromADictionary",
    category: "Dictionary",
    code: `const omitted = ['key1', 'key2'];
return { output: Object.fromEntries(
  Object.entries(inputs.dict).filter(([k]) => !omitted.includes(k))
) };`,
    tags: ["omit", "exclude", "remove", "without"]
  },
  {
    id: "dict-to-json",
    title: "To JSON",
    titleKey: "toJSON",
    description: "Serialize a dictionary to JSON string",
    descriptionKey: "serializeADictionaryToJSONString",
    category: "Dictionary",
    code: "return { output: JSON.stringify(inputs.dict, null, 2) };",
    tags: ["json", "stringify", "serialize"]
  },
  {
    id: "dict-argmax",
    title: "Arg Max",
    titleKey: "argMax",
    description: "Find the key with the highest value",
    descriptionKey: "findTheKeyWithTheHighestValue",
    category: "Dictionary",
    code: `const entries = Object.entries(inputs.dict);
const [maxKey] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
return { output: maxKey };`,
    tags: ["argmax", "max", "key", "highest"]
  },
  {
    id: "dict-map-values",
    title: "Map Values",
    titleKey: "mapValues",
    description: "Transform all values in a dictionary",
    descriptionKey: "transformAllValuesInADictionary",
    category: "Dictionary",
    code: `return { output: Object.fromEntries(
  Object.entries(inputs.dict).map(([k, v]) => [k, v * 2])
) };`,
    tags: ["map", "transform", "values"]
  },

  // ---------------------------------------------------------------------------
  // Date & Time
  // ---------------------------------------------------------------------------
  {
    id: "date-today",
    title: "Today / Now",
    titleKey: "todayNow",
    description: "Get the current date or datetime",
    descriptionKey: "getTheCurrentDateOrDatetime",
    category: "Date & Time",
    code: `const now = new Date();
return {
  date: now.toISOString().split("T")[0],
  datetime: now.toISOString(),
  timestamp: now.getTime()
};`,
    tags: ["today", "now", "current", "date", "time"]
  },
  {
    id: "date-parse",
    title: "Parse Date",
    titleKey: "parseDate",
    description: "Parse a date string",
    descriptionKey: "parseADateString",
    category: "Date & Time",
    code: `const d = new Date(inputs.dateString);
return { output: d.toISOString() };`,
    tags: ["parse", "convert", "string", "date"]
  },
  {
    id: "date-format",
    title: "Format Date",
    titleKey: "formatDate",
    description: "Format a date into a readable string",
    descriptionKey: "formatADateIntoAReadableString",
    category: "Date & Time",
    code: `const d = new Date(inputs.dateString);
return {
  iso: d.toISOString(),
  local: d.toLocaleDateString(),
  time: d.toLocaleTimeString(),
  full: d.toLocaleString()
};`,
    tags: ["format", "display", "locale", "string"]
  },
  {
    id: "date-add",
    title: "Add Time",
    titleKey: "addTime",
    description: "Add days, hours, or minutes to a date",
    descriptionKey: "addDaysHoursOrMinutesToADate",
    category: "Date & Time",
    code: `const d = new Date(inputs.dateString);
d.setDate(d.getDate() + inputs.days);
// d.setHours(d.getHours() + hours);
// d.setMinutes(d.getMinutes() + minutes);
return { output: d.toISOString() };`,
    tags: ["add", "offset", "delta", "shift"]
  },
  {
    id: "date-diff",
    title: "Date Difference",
    titleKey: "dateDifference",
    description: "Calculate the difference between two dates",
    descriptionKey: "calculateTheDifferenceBetweenTwoDates",
    category: "Date & Time",
    code: `const a = new Date(inputs.dateA), b = new Date(inputs.dateB);
const ms = Math.abs(a - b);
return {
  days: Math.floor(ms / 86400000),
  hours: Math.floor(ms / 3600000),
  minutes: Math.floor(ms / 60000)
};`,
    tags: ["difference", "diff", "between", "elapsed", "duration"]
  },
  {
    id: "date-weekday",
    title: "Day of Week",
    titleKey: "dayOfWeek",
    description: "Get the day of the week",
    descriptionKey: "getTheDayOfTheWeek",
    category: "Date & Time",
    code: `const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const d = new Date(inputs.dateString);
return { output: days[d.getDay()], index: d.getDay() };`,
    tags: ["weekday", "day", "week", "name"]
  },
  {
    id: "date-range",
    title: "Date Range",
    titleKey: "dateRange",
    description: "Generate a list of dates between start and end",
    descriptionKey: "generateAListOfDatesBetweenStartAndEnd",
    category: "Date & Time",
    code: `const dates = [];
const d = new Date(inputs.start);
const e = new Date(inputs.end);
while (d <= e) {
  dates.push(d.toISOString().split("T")[0]);
  d.setDate(d.getDate() + 1);
}
return { output: dates };`,
    tags: ["range", "sequence", "between", "generate"]
  },
  {
    id: "date-start-end",
    title: "Start / End of Period",
    titleKey: "startEndOfPeriod",
    description:
      "Start and end of the day, week, month, or year containing a date",
    category: "Date & Time",
    code: `// unit: "day" | "week" | "month" | "year" — the week starts on Sunday
const unit = "week";
const start = new Date(inputs.date);
if (unit === "year") start.setMonth(0, 1);
if (unit === "month") start.setDate(1);
if (unit === "week") start.setDate(start.getDate() - start.getDay());
start.setHours(0, 0, 0, 0);
const next = new Date(start);
if (unit === "year") next.setFullYear(next.getFullYear() + 1);
else if (unit === "month") next.setMonth(next.getMonth() + 1);
else next.setDate(next.getDate() + (unit === "week" ? 7 : 1));
const end = new Date(next.getTime() - 1);
return {
  start_iso: start.toISOString(),
  end_iso: end.toISOString(),
  start,
  end
};`,
    tags: ["start", "end", "period", "boundary", "day", "week", "month", "year"]
  },
  {
    id: "date-constant",
    title: "Make Date",
    titleKey: "makeDate",
    description: "Build a date object from year, month, and day numbers",
    descriptionKey: "buildADateObjectFromYearMonthAndDayNumbers",
    category: "Date & Time",
    code: `// month is 1-12, day is 1-31
return { output: { year: inputs.year, month: inputs.month, day: inputs.day } };`,
    tags: ["date", "make", "create", "constant", "year", "month", "day"]
  },
  {
    id: "date-constant-datetime",
    title: "Make Date Time",
    titleKey: "makeDateTime",
    description:
      "Build a datetime object from year, month, day, hour, minute, and second",
    category: "Date & Time",
    code: `// utc_offset is in seconds and describes the wall-clock fields above
return {
  output: {
    year: inputs.year,
    month: inputs.month,
    day: inputs.day,
    hour: inputs.hour,
    minute: inputs.minute,
    second: inputs.second,
    microsecond: 0,
    tzinfo: "UTC",
    utc_offset: 0
  }
};`,
    tags: [
      "datetime",
      "make",
      "create",
      "constant",
      "hour",
      "minute",
      "second",
      "timezone"
    ]
  },

  // ---------------------------------------------------------------------------
  // UUID
  // ---------------------------------------------------------------------------
  {
    id: "uuid-v4",
    title: "Generate UUID v4",
    titleKey: "generateUUIDV4",
    description: "Generate a random UUID v4",
    descriptionKey: "generateARandomUUIDV4",
    category: "UUID",
    code: "return { output: crypto.randomUUID() };",
    tags: ["uuid", "v4", "random", "generate", "id"]
  },
  {
    id: "uuid-validate",
    title: "Validate UUID",
    titleKey: "validateUUID",
    description: "Check if a string is a valid UUID",
    descriptionKey: "checkIfAStringIsAValidUUID",
    category: "UUID",
    code: `const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
return { output: re.test(inputs.value) };`,
    tags: ["uuid", "validate", "check", "valid"]
  },

  // ---------------------------------------------------------------------------
  // HTTP
  // ---------------------------------------------------------------------------
  // HTTP snippets removed — use lib.http.* nodes instead (GetText, GetJSON, GetBytes, Post, Put, Patch, Delete)

  // ---------------------------------------------------------------------------
  // JSON
  // ---------------------------------------------------------------------------
  {
    id: "json-parse",
    title: "Parse JSON",
    titleKey: "parseJSON",
    description: "Parse a JSON string into an object",
    descriptionKey: "parseAJSONStringIntoAnObject",
    category: "JSON",
    code: "return { output: JSON.parse(inputs.text) };",
    tags: ["json", "parse", "decode", "string", "convert"]
  },
  {
    id: "json-stringify",
    title: "Stringify JSON",
    titleKey: "stringifyJSON",
    description: "Convert an object to a formatted JSON string",
    descriptionKey: "convertAnObjectToAFormattedJSONString",
    category: "JSON",
    code: "return { output: JSON.stringify(data, null, 2) };",
    tags: ["json", "stringify", "encode", "format"]
  },
  {
    id: "json-path",
    title: "Get JSON Path",
    titleKey: "getJSONPath",
    description:
      "Extract a value using dot-path notation (e.g. 'user.address.city')",
    category: "JSON",
    code: `const value = String(inputs.path).split(".").reduce(
  (acc, k) => (acc == null ? acc : acc[k]),
  data
);
return { output: value };`,
    tags: ["json", "path", "dot", "nested", "extract", "get", "jsonpath"]
  },
  {
    id: "json-filter",
    title: "Filter JSON Array",
    titleKey: "filterJSONArray",
    description: "Filter an array of objects by a key-value match",
    descriptionKey: "filterAnArrayOfObjectsByAKeyvalueMatch",
    category: "JSON",
    code: `return { output: data.filter(item => item[inputs.key] === inputs.value) };`,
    tags: ["json", "filter", "array", "query", "search"]
  },
  {
    id: "json-csv-parse",
    title: "Parse CSV",
    titleKey: "parseCSV",
    description: "Parse CSV text into an array of objects",
    descriptionKey: "parseCSVTextIntoAnArrayOfObjects",
    category: "JSON",
    code: `const lines = inputs.text.trim().split("\\n");
const headers = lines[0].split(",").map(h => h.trim());
const rows = lines.slice(1).map(line => {
  const values = line.split(",");
  return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim()]));
});
return { output: rows };`,
    tags: ["csv", "parse", "table", "spreadsheet", "data"]
  },

  // ---------------------------------------------------------------------------
  // Streaming
  // ---------------------------------------------------------------------------
  {
    id: "stream-foreach",
    title: "Yield Each Item",
    titleKey: "yieldEachItem",
    description:
      "Emit each item from a list as a separate output (streaming producer)",
    category: "Streaming",
    code: `for (const item of list) {
  yield({ output: item });
}`,
    tags: ["foreach", "iterate", "yield", "stream", "emit"]
  },
  {
    id: "stream-collect",
    title: "Collect Items",
    titleKey: "collectItems",
    description: "Accumulate streaming items into a list",
    descriptionKey: "accumulateStreamingItemsIntoAList",
    category: "Streaming",
    code: `state.items = [...(state.items || []), inputs.input];
return { output: [...state.items] };`,
    tags: ["collect", "accumulate", "gather", "aggregate", "stream"]
  },
  {
    id: "stream-filter",
    title: "Stream Filter",
    titleKey: "streamFilter",
    description: "Filter a stream — return {} to drop an item",
    descriptionKey: "filterAStreamReturnToDropAnItem",
    category: "Streaming",
    code: `// Return {} to drop the item, or { output: value } to pass it through
return inputs.value > inputs.threshold ? { output: inputs.value } : {};`,
    tags: ["stream", "filter", "drop", "pass", "gate"]
  },
  {
    id: "stream-counter",
    title: "Stream Counter",
    titleKey: "streamCounter",
    description: "Count items passing through a stream",
    descriptionKey: "countItemsPassingThroughAStream",
    category: "Streaming",
    code: `state.count = (state.count || 0) + 1;
return { output: inputs.input, count: state.count };`,
    tags: ["count", "counter", "stream", "tally", "increment"]
  },
  {
    id: "stream-batch",
    title: "Stream Batch",
    titleKey: "streamBatch",
    description: "Collect N items then emit as a batch",
    descriptionKey: "collectNItemsThenEmitAsABatch",
    category: "Streaming",
    code: `const batchSize = 5;
state.items = [...(state.items || []), inputs.input];
if (state.items.length >= batchSize) {
  const batch = [...state.items];
  state.items = [];
  return { output: batch };
}
return {};`,
    tags: ["batch", "buffer", "chunk", "window", "stream"]
  },

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------
  {
    id: "file-read",
    title: "Read File",
    titleKey: "readFile",
    description: "Read a text file from the workspace",
    descriptionKey: "readATextFileFromTheWorkspace",
    category: "Files",
    code: `const content = await workspace.read(inputs.path);
return { output: content };`,
    tags: ["file", "read", "workspace", "load", "text"],
    inputs: {
      path: { type: "str", description: "Path relative to the workspace" }
    },
    outputs: { output: "str" }
  },
  {
    id: "file-write",
    title: "Write File",
    titleKey: "writeFile",
    description:
      "Write text content to a workspace file, creating parent directories",
    category: "Files",
    code: `await workspace.write(inputs.path, inputs.content);
return { output: inputs.path };`,
    tags: ["file", "write", "save", "workspace", "export"],
    inputs: {
      path: { type: "str", description: "Path relative to the workspace" },
      content: { type: "str" }
    },
    outputs: { output: "str" }
  },
  {
    id: "file-append",
    title: "Append To File",
    titleKey: "appendToFile",
    description: "Append text to a workspace file, creating it when missing",
    descriptionKey: "appendTextToAWorkspaceFileCreatingItWhenMissing",
    category: "Files",
    code: `const info = await workspace.stat(inputs.path);
const existing = info.exists ? await workspace.read(inputs.path) : "";
await workspace.write(inputs.path, existing + inputs.content);
return { output: inputs.path };`,
    tags: ["file", "append", "write", "log", "workspace"],
    inputs: {
      path: { type: "str", description: "Path relative to the workspace" },
      content: { type: "str" }
    },
    outputs: { output: "str" }
  },
  {
    id: "file-list",
    title: "List Files",
    titleKey: "listFiles",
    description: "List the entry names of a workspace directory",
    descriptionKey: "listTheEntryNamesOfAWorkspaceDirectory",
    category: "Files",
    code: `const files = await workspace.list(inputs.path);
return { output: files };`,
    tags: ["file", "list", "directory", "ls", "workspace"],
    inputs: { path: { type: "str", default: "." } },
    outputs: { output: "list" }
  },
  {
    id: "file-list-match",
    title: "Find Files",
    titleKey: "findFiles",
    description:
      "Find files matching a wildcard pattern, optionally recursing; paths outside the workspace need Allow Host Filesystem",
    category: "Files",
    code: `const pattern = "*"; // wildcard on the file name, e.g. *.txt
const recursive = false;
const rx = new RegExp(
  "^" +
    pattern
      .replace(/[.+^\${}()|[\\]\\\\]/g, "\\\\$&")
      .replace(/\\*/g, ".*")
      .replace(/\\?/g, ".") +
    "$",
  "i"
);
const found = [];
const scan = async (dir) => {
  const names = await workspace.list(dir);
  await Promise.all(
    names.map(async (name) => {
      const full = dir.replace(/\\/+$/, "") + "/" + name;
      const info = await workspace.stat(full);
      if (info.isDirectory) {
        if (recursive) await scan(full);
      } else if (rx.test(name)) {
        found.push(full);
      }
    })
  );
};
await scan(inputs.folder);
return { output: found, file: found[0] ?? "" };`,
    tags: ["file", "find", "glob", "pattern", "recursive", "walk", "directory"],
    inputs: {
      folder: { type: "str", default: ".", description: "Directory to scan" }
    },
    outputs: { output: "list", file: "str" }
  },
  {
    id: "file-read-binary",
    title: "Read Binary File",
    titleKey: "readBinaryFile",
    description: "Read a workspace file as a base64 string",
    descriptionKey: "readAWorkspaceFileAsABase64String",
    category: "Files",
    code: `const bytes = await workspace.readBytes(inputs.path);
return { output: toBase64(bytes) };`,
    tags: ["file", "binary", "read", "base64", "bytes"],
    inputs: {
      path: { type: "str", description: "Path relative to the workspace" }
    },
    outputs: { output: "str" }
  },
  {
    id: "file-write-binary",
    title: "Write Binary File",
    titleKey: "writeBinaryFile",
    description: "Write base64 content to a workspace file as raw bytes",
    descriptionKey: "writeBase64ContentToAWorkspaceFileAsRawBytes",
    category: "Files",
    code: `await workspace.writeBytes(inputs.path, fromBase64(inputs.content));
return { output: inputs.path };`,
    tags: ["file", "binary", "write", "base64", "bytes", "save"],
    inputs: {
      path: { type: "str", description: "Path relative to the workspace" },
      content: { type: "str", description: "Base64-encoded bytes" }
    },
    outputs: { output: "str" }
  },
  {
    id: "file-exists",
    title: "File Exists",
    titleKey: "fileExists",
    description:
      "Check whether a path exists; paths outside the workspace need Allow Host Filesystem",
    category: "Files",
    code: `return { output: (await workspace.stat(inputs.path)).exists };`,
    tags: ["file", "exists", "check", "missing", "branch"],
    inputs: { path: { type: "str" } },
    outputs: { output: "bool" }
  },
  {
    id: "file-stat",
    title: "File Info",
    titleKey: "fileInfo",
    description:
      "Size, kind and timestamps of a path in one call; paths outside the workspace need Allow Host Filesystem",
    category: "Files",
    code: `const info = await workspace.stat(inputs.path);
return {
  exists: info.exists,
  size: info.size,
  is_file: info.isFile,
  is_directory: info.isDirectory,
  created: new Date(info.createdMs).toISOString(),
  modified: new Date(info.modifiedMs).toISOString(),
  accessed: new Date(info.accessedMs).toISOString()
};`,
    tags: [
      "file",
      "stat",
      "size",
      "metadata",
      "is file",
      "is directory",
      "created",
      "modified",
      "accessed",
      "time"
    ],
    inputs: { path: { type: "str" } },
    outputs: {
      exists: "bool",
      size: "int",
      is_file: "bool",
      is_directory: "bool",
      created: "str",
      modified: "str",
      accessed: "str"
    }
  },
  {
    id: "file-mkdir",
    title: "Create Directory",
    titleKey: "createDirectory",
    description:
      "Create a directory and its parents; paths outside the workspace need Allow Host Filesystem",
    category: "Files",
    code: `await workspace.mkdir(inputs.path);
return { output: inputs.path };`,
    tags: ["directory", "folder", "create", "mkdir"],
    inputs: { path: { type: "str" } },
    outputs: { output: "str" }
  },
  {
    id: "file-copy",
    title: "Copy File",
    titleKey: "copyFile",
    description:
      "Copy a file, creating the destination directory; paths outside the workspace need Allow Host Filesystem",
    category: "Files",
    code: `await workspace.copy(inputs.source, inputs.destination);
return { output: inputs.destination };`,
    tags: ["file", "copy", "duplicate", "backup"],
    inputs: {
      source: { type: "str" },
      destination: { type: "str" }
    },
    outputs: { output: "str" }
  },
  {
    id: "file-move",
    title: "Move File",
    titleKey: "moveFile",
    description:
      "Move or rename a file, creating the destination directory; paths outside the workspace need Allow Host Filesystem",
    category: "Files",
    code: `await workspace.move(inputs.source, inputs.destination);
return { output: inputs.destination };`,
    tags: ["file", "move", "rename", "archive", "organize"],
    inputs: {
      source: { type: "str" },
      destination: { type: "str" }
    },
    outputs: { output: "str" }
  },
  {
    id: "file-workspace-dir",
    title: "Workspace Directory",
    titleKey: "workspaceDirectory",
    description:
      "Absolute path of the workspace root — the base for relative paths",
    category: "Files",
    code: `return { output: await workspace.root() };`,
    tags: ["workspace", "directory", "root", "path", "base"],
    outputs: { output: "str" }
  },

  // ---------------------------------------------------------------------------
  // Text (additional — replaces text-extra nodes)
  // ---------------------------------------------------------------------------
  {
    id: "text-extract",
    title: "Extract Substring",
    titleKey: "extractSubstring",
    description: "Extract a portion of text by start/end index",
    descriptionKey: "extractAPortionOfTextByStartendIndex",
    category: "Text",
    code: `return { output: inputs.text.slice(inputs.start, inputs.end) };`,
    tags: ["extract", "substring", "slice", "range"]
  },
  {
    id: "text-chunk",
    title: "Chunk Text",
    titleKey: "chunkText",
    description: "Split text into word-based chunks with optional overlap",
    descriptionKey: "splitTextIntoWordbasedChunksWithOptionalOverlap",
    category: "Text",
    code: `const chunkSize = 100, overlap = 0;
const words = inputs.text.split(" ");
const step = chunkSize - overlap;
const chunks = [];
for (let i = 0; i < words.length; i += step) {
  chunks.push(words.slice(i, i + chunkSize).join(" "));
}
return { output: chunks };`,
    tags: ["chunk", "split", "overlap", "window", "words"]
  },
  {
    id: "text-title-case",
    title: "Title Case",
    titleKey: "titleCase",
    description: "Convert text to title case (capitalize each word)",
    descriptionKey: "convertTextToTitleCaseCapitalizeEachWord",
    category: "Text",
    code: `return { output: inputs.text.replace(/\\w\\S*/g, w =>
  w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
) };`,
    tags: ["title", "case", "capitalize", "words", "titlecase"]
  },
  {
    id: "text-capitalize",
    title: "Capitalize",
    titleKey: "capitalize",
    description: "Capitalize only the first character",
    descriptionKey: "capitalizeOnlyTheFirstCharacter",
    category: "Text",
    code: `return { output: inputs.text.charAt(0).toUpperCase() + inputs.text.slice(1).toLowerCase() };`,
    tags: ["capitalize", "first", "letter", "sentence"]
  },
  {
    id: "text-starts-with",
    title: "Starts With",
    titleKey: "startsWith",
    description: "Check if text starts with a prefix",
    descriptionKey: "checkIfTextStartsWithAPrefix",
    category: "Text",
    code: `return { output: inputs.text.startsWith(inputs.prefix) };`,
    tags: ["starts", "prefix", "check", "begins"]
  },
  {
    id: "text-ends-with",
    title: "Ends With",
    titleKey: "endsWith",
    description: "Check if text ends with a suffix",
    descriptionKey: "checkIfTextEndsWithASuffix",
    category: "Text",
    code: `return { output: inputs.text.endsWith(inputs.suffix) };`,
    tags: ["ends", "suffix", "check", "extension"]
  },
  {
    id: "text-contains",
    title: "Contains",
    titleKey: "contains",
    description: "Check if text contains a substring (case-insensitive option)",
    descriptionKey: "checkIfTextContainsASubstringCaseinsensitiveOption",
    category: "Text",
    code: `// case insensitive: text.toLowerCase().includes(sub.toLowerCase())
return { output: inputs.text.includes(inputs.substring) };`,
    tags: ["contains", "includes", "search", "find"]
  },
  {
    id: "text-is-empty",
    title: "Is Empty",
    titleKey: "isEmpty",
    description: "Check if text is empty or only whitespace",
    descriptionKey: "checkIfTextIsEmptyOrOnlyWhitespace",
    category: "Text",
    code: `return { output: inputs.text.trim().length === 0 };`,
    tags: ["empty", "blank", "whitespace", "check"]
  },
  {
    id: "text-collapse-whitespace",
    title: "Collapse Whitespace",
    titleKey: "collapseWhitespace",
    description: "Replace runs of whitespace with a single space",
    descriptionKey: "replaceRunsOfWhitespaceWithASingleSpace",
    category: "Text",
    code: `return { output: inputs.text.trim().replace(/\\s+/g, " ") };`,
    tags: ["whitespace", "collapse", "normalize", "clean"]
  },
  {
    id: "text-remove-punctuation",
    title: "Remove Punctuation",
    titleKey: "removePunctuation",
    description: "Remove punctuation characters from text",
    descriptionKey: "removePunctuationCharactersFromText",
    category: "Text",
    code: `return { output: inputs.text.replace(/[!"#$%&'()*+,\\-./:;<=>?@[\\\\\\]^_\`{|}~]/g, "") };`,
    tags: ["punctuation", "remove", "clean", "strip"]
  },
  {
    id: "text-strip-accents",
    title: "Strip Accents",
    titleKey: "stripAccents",
    description: "Remove accent marks, keeping base characters",
    descriptionKey: "removeAccentMarksKeepingBaseCharacters",
    category: "Text",
    code: `return { output: inputs.text.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "") };`,
    tags: ["accents", "diacritics", "normalize", "unicode"]
  },
  {
    id: "text-slugify",
    title: "Slugify",
    titleKey: "slugify",
    description: "Convert text to a URL-safe slug",
    descriptionKey: "convertTextToAURLsafeSlug",
    category: "Text",
    code: `return { output: inputs.text
  .normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "")
  .replace(/[^\\w\\s-]/g, "")
  .replace(/[\\s_-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .toLowerCase()
};`,
    tags: ["slug", "url", "normalize", "id", "kebab", "slugify"]
  },
  {
    id: "text-count-tokens",
    title: "Count Tokens",
    titleKey: "countTokens",
    description: "Count LLM tokens in text with tiktoken",
    descriptionKey: "countLLMTokensInTextWithTiktoken",
    category: "Text",
    code: `import { count } from "@nodetool-ai/sandbox-tokens";
return { output: await count(inputs.text, "cl100k_base") };`,
    outputs: { output: "int" },
    tags: [
      "tokens",
      "token",
      "count",
      "tiktoken",
      "encoding",
      "context",
      "budget",
      "llm"
    ]
  },
  {
    id: "text-length",
    title: "Measure Length",
    titleKey: "measureLength",
    description: "Count characters, words, or lines in text",
    descriptionKey: "countCharactersWordsOrLinesInText",
    category: "Text",
    code: `return {
  chars: inputs.text.length,
  words: inputs.text.split(/\\s+/).filter(Boolean).length,
  lines: inputs.text.split(/\\r?\\n/).length
};`,
    tags: ["length", "count", "words", "lines", "characters"]
  },
  {
    id: "text-index-of",
    title: "Index Of",
    titleKey: "indexOf",
    description: "Find the position of a substring",
    descriptionKey: "findThePositionOfASubstring",
    category: "Text",
    code: `return { output: inputs.text.indexOf(inputs.substring) };`,
    tags: ["index", "find", "position", "search", "indexOf"]
  },
  {
    id: "text-surround",
    title: "Surround / Wrap",
    titleKey: "surroundWrap",
    description: "Wrap text with a prefix and suffix",
    descriptionKey: "wrapTextWithAPrefixAndSuffix",
    category: "Text",
    code: `return { output: inputs.prefix + inputs.text + inputs.suffix };`,
    tags: ["surround", "wrap", "prefix", "suffix", "bracket"]
  },
  {
    id: "text-truncate",
    title: "Truncate",
    titleKey: "truncate",
    description: "Truncate text to a max length with optional ellipsis",
    descriptionKey: "truncateTextToAMaxLengthWithOptionalEllipsis",
    category: "Text",
    code: `const maxLen = 100, ellipsis = "...";
if (inputs.text.length <= maxLen) return { output: inputs.text };
return { output: inputs.text.slice(0, maxLen - ellipsis.length) + ellipsis };`,
    tags: ["truncate", "clip", "shorten", "ellipsis"]
  },
  {
    id: "text-compare",
    title: "Compare Text",
    titleKey: "compareText",
    description: "Compare two strings (equal, less, greater)",
    descriptionKey: "compareTwoStringsEqualLessGreater",
    category: "Text",
    code: `const result = inputs.a < inputs.b ? "less" : inputs.a > inputs.b ? "greater" : "equal";
return { output: result, equal: inputs.a === inputs.b };`,
    tags: ["compare", "sort", "order", "equal", "lexical", "equals"]
  },
  {
    id: "text-has-length",
    title: "Check Length",
    titleKey: "checkLength",
    description:
      "Check text length against a minimum, maximum, or exact length",
    category: "Text",
    code: `// 0 means unset; an exact length wins over min/max
const minLength = 3, maxLength = 10, exactLength = 0;
const len = inputs.text.length;
if (exactLength > 0) return { output: len === exactLength };
if (minLength > 0 && len < minLength) return { output: false };
if (maxLength > 0 && len > maxLength) return { output: false };
return { output: true };`,
    tags: [
      "length",
      "check",
      "compare",
      "validate",
      "min",
      "max",
      "exact",
      "size"
    ]
  },

  // ---------------------------------------------------------------------------
  // Regex (replaces text-extra regex nodes)
  // ---------------------------------------------------------------------------
  {
    id: "regex-extract-groups",
    title: "Extract Regex Groups",
    titleKey: "extractRegexGroups",
    description: "Extract capture groups from the first match",
    descriptionKey: "extractCaptureGroupsFromTheFirstMatch",
    category: "Regex",
    code: `const match = new RegExp(inputs.pattern).exec(inputs.text);
return { output: match ? match.slice(1) : [] };`,
    tags: ["regex", "extract", "groups", "capture"]
  },
  {
    id: "regex-find-all",
    title: "Find All Matches",
    titleKey: "findAllMatches",
    description: "Find all occurrences of a pattern",
    descriptionKey: "findAllOccurrencesOfAPattern",
    category: "Regex",
    code: `const matches = [...inputs.text.matchAll(new RegExp(inputs.pattern, "g"))].map(m => m[0]);
return { output: matches };`,
    tags: ["regex", "find", "all", "matchAll", "global"]
  },
  {
    id: "regex-replace",
    title: "Regex Replace",
    titleKey: "regexReplace",
    description: "Replace text matching a regex pattern",
    descriptionKey: "replaceTextMatchingARegexPattern",
    category: "Regex",
    code: `return { output: inputs.text.replace(new RegExp(inputs.pattern, "g"), inputs.replacement) };`,
    tags: ["regex", "replace", "substitute", "gsub"]
  },
  {
    id: "regex-split",
    title: "Regex Split",
    titleKey: "regexSplit",
    description: "Split text using a regex delimiter",
    descriptionKey: "splitTextUsingARegexDelimiter",
    category: "Regex",
    code: `return { output: inputs.text.split(new RegExp(inputs.pattern)) };`,
    tags: ["regex", "split", "tokenize", "delimiter"]
  },
  {
    id: "regex-validate",
    title: "Regex Validate",
    titleKey: "regexValidate",
    description: "Check if text matches a regex pattern",
    descriptionKey: "checkIfTextMatchesARegexPattern",
    category: "Regex",
    code: `return { output: new RegExp(inputs.pattern).test(inputs.text) };`,
    tags: ["regex", "validate", "test", "check", "match"]
  },
  {
    id: "regex-match-groups",
    title: "Match with Groups",
    titleKey: "matchWithGroups",
    description: "Find all matches and extract a specific capture group",
    descriptionKey: "findAllMatchesAndExtractASpecificCaptureGroup",
    category: "Regex",
    code: `const group = 1; // 0 = full match, 1+ = capture group
const matches = [...inputs.text.matchAll(new RegExp(inputs.pattern, "g"))]
  .map(m => m[group])
  .filter(v => v !== undefined);
return { output: matches };`,
    tags: ["regex", "match", "groups", "capture", "extract"]
  },
  {
    id: "regex-replace-limited",
    title: "Replace N Times",
    titleKey: "replaceNTimes",
    description: "Replace only the first N occurrences of a pattern",
    descriptionKey: "replaceOnlyTheFirstNOccurrencesOfAPattern",
    category: "Regex",
    code: `let count = 0;
const maxReplacements = 2;
const result = inputs.text.replace(new RegExp(inputs.pattern, "g"), (match) => {
  if (count >= maxReplacements) return match;
  count++;
  return inputs.replacement;
});
return { output: result };`,
    tags: ["regex", "replace", "count", "limit", "first"]
  },

  // ---------------------------------------------------------------------------
  // JSON (additional — replaces ExtractJSON node)
  // ---------------------------------------------------------------------------
  {
    id: "json-extract-path",
    title: "Extract JSONPath",
    titleKey: "extractJSONPath",
    description: "Extract values using dot-path with wildcard support",
    descriptionKey: "extractValuesUsingDotpathWithWildcardSupport",
    category: "JSON",
    code: `// Supports: $.store.book[0].title, $.store.*, $.items[*].name
const tokens = inputs.path.replace(/^\\$\\.?/, "").replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
let current = [data];
for (const t of tokens) {
  const next = [];
  for (const v of current) {
    if (t === "*") {
      if (Array.isArray(v)) next.push(...v);
      else if (v && typeof v === "object") next.push(...Object.values(v));
    } else if (Array.isArray(v) && /^\\d+$/.test(t)) next.push(v[Number(t)]);
    else if (v && typeof v === "object" && t in v) next.push(v[t]);
  }
  current = next;
}
return { output: current.length === 1 ? current[0] : current };`,
    tags: ["json", "jsonpath", "extract", "nested", "wildcard"]
  },

  // ---------------------------------------------------------------------------
  // Path
  // ---------------------------------------------------------------------------
  {
    id: "path-basename",
    title: "Basename / File Name",
    titleKey: "basenameFileName",
    description: "Get the file name from a path, with and without extension",
    descriptionKey: "getTheFileNameFromAPathWithAndWithoutExtension",
    category: "Path",
    code: `const p = String(inputs.path).replace(/\\/+$/, "");
const base = p.slice(p.lastIndexOf("/") + 1);
const dot = base.lastIndexOf(".");
const ext = dot > 0 && base !== ".." ? base.slice(dot) : "";
return { output: base, stem: ext ? base.slice(0, -ext.length) : base };`,
    tags: [
      "basename",
      "filename",
      "file name",
      "name",
      "path",
      "stem",
      "remove extension"
    ]
  },
  {
    id: "path-dirname",
    title: "Dirname / Get Directory",
    titleKey: "dirnameGetDirectory",
    description: "Get the directory containing a path",
    descriptionKey: "getTheDirectoryContainingAPath",
    category: "Path",
    code: `const p = String(inputs.path).replace(/(?!^)\\/+$/, "");
const i = p.lastIndexOf("/");
return { output: i < 0 ? "." : i === 0 ? "/" : p.slice(0, i) };`,
    tags: ["dirname", "directory", "folder", "parent", "get directory", "path"]
  },
  {
    id: "path-split",
    title: "Split Path",
    titleKey: "splitPath",
    description: "Split a path into directory and file name",
    descriptionKey: "splitAPathIntoDirectoryAndFileName",
    category: "Path",
    code: `const p = String(inputs.path).replace(/(?!^)\\/+$/, "");
const i = p.lastIndexOf("/");
return {
  dirname: i < 0 ? "." : i === 0 ? "/" : p.slice(0, i),
  basename: p.slice(i + 1)
};`,
    tags: ["split", "split path", "dirname", "basename", "path", "components"]
  },
  {
    id: "path-split-extension",
    title: "Split Extension",
    titleKey: "splitExtension",
    description:
      "Split a path into root and extension (dotfiles have no extension)",
    category: "Path",
    code: `const p = String(inputs.path).replace(/(?!^)\\/+$/, "");
const base = p.slice(p.lastIndexOf("/") + 1);
const dot = base.lastIndexOf(".");
const extension = dot > 0 && base !== ".." ? base.slice(dot) : "";
return { root: extension ? p.slice(0, -extension.length) : p, extension };`,
    tags: [
      "extension",
      "file extension",
      "splitext",
      "split extension",
      "suffix",
      "path",
      "split"
    ]
  },
  {
    id: "path-join",
    title: "Join Paths",
    titleKey: "joinPaths",
    description: "Join path components into one normalized path",
    descriptionKey: "joinPathComponentsIntoOneNormalizedPath",
    category: "Path",
    code: `const joined = inputs.paths.map(String).filter(Boolean).join("/");
const abs = joined.startsWith("/");
const trail = joined.length > 1 && joined.endsWith("/");
const out = [];
for (const seg of joined.split("/")) {
  if (!seg || seg === ".") continue;
  if (seg === ".." && out.length && out[out.length - 1] !== "..") out.pop();
  else if (seg !== ".." || !abs) out.push(seg);
}
let result = (abs ? "/" : "") + out.join("/");
if (!result) result = ".";
return { output: trail && !result.endsWith("/") ? result + "/" : result };`,
    tags: ["join", "join paths", "combine", "concat", "path", "build path"]
  },
  {
    id: "path-normalize",
    title: "Normalize Path",
    titleKey: "normalizePath",
    description: "Collapse redundant separators, '.' and '..' segments",
    descriptionKey: "collapseRedundantSeparatorsAndSegments",
    category: "Path",
    code: `const p = String(inputs.path);
const abs = p.startsWith("/");
const trail = p.length > 1 && p.endsWith("/");
const out = [];
for (const seg of p.split("/")) {
  if (!seg || seg === ".") continue;
  if (seg === ".." && out.length && out[out.length - 1] !== "..") out.pop();
  else if (seg !== ".." || !abs) out.push(seg);
}
let result = (abs ? "/" : "") + out.join("/");
if (!result) result = ".";
return { output: trail && !result.endsWith("/") ? result + "/" : result };`,
    tags: ["normalize", "clean", "canonical", "path", "dot dot", "separators"]
  },
  {
    id: "path-absolute",
    title: "Absolute Path",
    titleKey: "absolutePath",
    description: "Resolve a path against a base directory",
    descriptionKey: "resolveAPathAgainstABaseDirectory",
    category: "Path",
    code: `const base = "/workspace"; // directory relative paths resolve against
const p = String(inputs.path);
const joined = p.startsWith("/") ? p : base.replace(/\\/+$/, "") + "/" + p;
const out = [];
for (const seg of joined.split("/")) {
  if (!seg || seg === ".") continue;
  if (seg === ".." && out.length) out.pop();
  else if (seg !== "..") out.push(seg);
}
return { output: "/" + out.join("/") };`,
    tags: ["absolute", "absolute path", "resolve", "full path", "path"]
  },
  {
    id: "path-relative",
    title: "Relative Path",
    titleKey: "relativePath",
    description:
      "Path from a start directory to a target (both anchored the same way)",
    category: "Path",
    code: `const segs = (s) => {
  const out = [];
  for (const seg of String(s).split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out;
};
const from = segs(inputs.start_path);
const to = segs(inputs.target_path);
let i = 0;
while (i < from.length && i < to.length && from[i] === to[i]) i++;
const up = new Array(from.length - i).fill("..");
return { output: [...up, ...to.slice(i)].join("/") };`,
    tags: [
      "relative",
      "relative path",
      "relpath",
      "between",
      "path",
      "portable"
    ]
  },
  {
    id: "path-info",
    title: "Path Info",
    titleKey: "pathInfo",
    description: "All components of a path in one dictionary",
    descriptionKey: "allComponentsOfAPathInOneDictionary",
    category: "Path",
    code: `const base_dir = "/workspace"; // directory relative paths resolve against
const p = String(inputs.path);
const trimmed = p.replace(/(?!^)\\/+$/, "");
const i = trimmed.lastIndexOf("/");
const basename = trimmed.slice(i + 1);
const dot = basename.lastIndexOf(".");
const extension = dot > 0 && basename !== ".." ? basename.slice(dot) : "";
const out = [];
const joined = p.startsWith("/") ? p : base_dir.replace(/\\/+$/, "") + "/" + p;
for (const seg of joined.split("/")) {
  if (!seg || seg === ".") continue;
  if (seg === ".." && out.length) out.pop();
  else if (seg !== "..") out.push(seg);
}
return {
  output: {
    dirname: i < 0 ? "." : i === 0 ? "/" : trimmed.slice(0, i),
    basename,
    extension,
    stem: extension ? basename.slice(0, -extension.length) : basename,
    absolute: "/" + out.join("/"),
    is_absolute: p.startsWith("/")
  }
};`,
    tags: [
      "path info",
      "info",
      "metadata",
      "components",
      "parse path",
      "dirname",
      "basename",
      "extension",
      "path"
    ]
  },
  {
    id: "path-to-string",
    title: "Path To String",
    titleKey: "pathToString",
    description: "Get the raw string from a file path value",
    descriptionKey: "getTheRawStringFromAFilePathValue",
    category: "Path",
    code: `return {
  output: typeof inputs.file_path === "string" ? inputs.file_path : String(inputs.file_path?.path ?? "")
};`,
    tags: ["path to string", "string", "convert", "file path", "path", "raw"]
  },
  {
    id: "path-match",
    title: "File Name Match",
    titleKey: "fileNameMatch",
    description: "Match a file name against a Unix wildcard pattern",
    descriptionKey: "matchAFileNameAgainstAUnixWildcardPattern",
    category: "Path",
    code: `const case_sensitive = true; // set false to ignore case
// Wildcards: * matches any run of characters, ? matches one
const rx = new RegExp(
  "^" +
    String(inputs.pattern)
      .replace(/[.+^\${}()|[\\]\\\\]/g, "\\\\$&")
      .replace(/\\*/g, ".*")
      .replace(/\\?/g, ".") +
    "$",
  case_sensitive ? "" : "i"
);
return { output: rx.test(String(inputs.filename)) };`,
    tags: [
      "match",
      "file name match",
      "pattern",
      "wildcard",
      "glob",
      "fnmatch",
      "path"
    ]
  },
  {
    id: "path-filter-names",
    title: "Filter File Names",
    titleKey: "filterFileNames",
    description: "Keep the file names matching a Unix wildcard pattern",
    descriptionKey: "keepTheFileNamesMatchingAUnixWildcardPattern",
    category: "Path",
    code: `const case_sensitive = true; // set false to ignore case
// Wildcards: * matches any run of characters, ? matches one
const rx = new RegExp(
  "^" +
    String(inputs.pattern)
      .replace(/[.+^\${}()|[\\]\\\\]/g, "\\\\$&")
      .replace(/\\*/g, ".*")
      .replace(/\\?/g, ".") +
    "$",
  case_sensitive ? "" : "i"
);
return { output: inputs.filenames.map(String).filter((name) => rx.test(name)) };`,
    tags: [
      "filter",
      "filter file names",
      "pattern",
      "wildcard",
      "glob",
      "list",
      "path"
    ]
  },

  // ---------------------------------------------------------------------------
  // SVG
  // ---------------------------------------------------------------------------
  // Each snippet returns an `svg_element` object — `{ name, attributes, children,
  // content }` — the exact shape `lib.svg.Document` / `lib.svg.SVGToImage` accept
  // in their `elements` list. Attribute values and text content are escaped by
  // the document node when it serializes, so never pre-escape here.
  {
    id: "svg-rect",
    title: "Rectangle",
    titleKey: "rectangle",
    description: "SVG rectangle element with position, size, and styling",
    descriptionKey: "svgRectangleElementWithPositionSizeAndStyling",
    category: "SVG",
    code: `return {
  output: {
    name: "rect",
    attributes: {
      x: inputs.x, y: inputs.y, width: inputs.width, height: inputs.height,
      fill: inputs.fill,
      stroke: inputs.stroke,
      "stroke-width": inputs.stroke_width
    }
  }
};`,
    tags: ["rect", "rectangle", "square", "shape", "vector", "svg", "box"],
    inputs: {
      x: { type: "int", default: 0 },
      y: { type: "int", default: 0 },
      width: { type: "int", default: 100, min: 0 },
      height: { type: "int", default: 100, min: 0 },
      fill: { type: "color", default: "#000000" },
      stroke: { type: "color", default: "#000000" },
      stroke_width: { type: "float", default: 1, min: 0 }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-circle",
    title: "Circle",
    titleKey: "circle",
    description: "SVG circle element with center, radius, and styling",
    descriptionKey: "svgCircleElementWithCenterRadiusAndStyling",
    category: "SVG",
    code: `return {
  output: {
    name: "circle",
    attributes: {
      cx: inputs.cx, cy: inputs.cy,
      r: inputs.radius,
      fill: inputs.fill,
      stroke: inputs.stroke,
      "stroke-width": inputs.stroke_width
    }
  }
};`,
    tags: ["circle", "round", "dot", "shape", "vector", "svg"],
    inputs: {
      cx: { type: "int", default: 0 },
      cy: { type: "int", default: 0 },
      radius: { type: "int", default: 50, min: 0 },
      fill: { type: "color", default: "#000000" },
      stroke: { type: "color", default: "#000000" },
      stroke_width: { type: "float", default: 1, min: 0 }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-ellipse",
    title: "Ellipse",
    titleKey: "ellipse",
    description: "SVG ellipse element with center, x/y radii, and styling",
    descriptionKey: "svgEllipseElementWithCenterXyRadiiAndStyling",
    category: "SVG",
    code: `return {
  output: {
    name: "ellipse",
    attributes: {
      cx: inputs.cx, cy: inputs.cy, rx: inputs.rx, ry: inputs.ry,
      fill: inputs.fill,
      stroke: inputs.stroke,
      "stroke-width": inputs.stroke_width
    }
  }
};`,
    tags: ["ellipse", "oval", "shape", "vector", "svg"],
    inputs: {
      cx: { type: "int", default: 0 },
      cy: { type: "int", default: 0 },
      rx: { type: "int", default: 50, min: 0 },
      ry: { type: "int", default: 30, min: 0 },
      fill: { type: "color", default: "#000000" },
      stroke: { type: "color", default: "#000000" },
      stroke_width: { type: "float", default: 1, min: 0 }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-line",
    title: "Line",
    description: "SVG line element between two points",
    descriptionKey: "svgLineElementBetweenTwoPoints",
    category: "SVG",
    code: `return {
  output: {
    name: "line",
    attributes: {
      x1: inputs.x1, y1: inputs.y1, x2: inputs.x2, y2: inputs.y2,
      stroke: inputs.stroke,
      "stroke-width": inputs.stroke_width
    }
  }
};`,
    tags: ["line", "segment", "connector", "divider", "shape", "vector", "svg"],
    inputs: {
      x1: { type: "int", default: 0 },
      y1: { type: "int", default: 0 },
      x2: { type: "int", default: 100 },
      y2: { type: "int", default: 100 },
      stroke: { type: "color", default: "#000000" },
      stroke_width: { type: "float", default: 1, min: 0 }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-polygon",
    title: "Polygon",
    description: "SVG polygon element from a list of vertices",
    descriptionKey: "svgPolygonElementFromAListOfVertices",
    category: "SVG",
    code: `// points: "x1,y1 x2,y2 x3,y3 ..."
return {
  output: {
    name: "polygon",
    attributes: {
      points: inputs.points,
      fill: inputs.fill,
      stroke: inputs.stroke,
      "stroke-width": inputs.stroke_width
    }
  }
};`,
    tags: ["polygon", "triangle", "star", "points", "shape", "vector", "svg"],
    inputs: {
      points: {
        type: "str",
        default: "",
        description: 'Vertices as "x1,y1 x2,y2 x3,y3 …"'
      },
      fill: { type: "color", default: "#000000" },
      stroke: { type: "color", default: "#000000" },
      stroke_width: { type: "float", default: 1, min: 0 }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-path",
    title: "Path",
    description: "SVG path element from path data commands",
    descriptionKey: "svgPathElementFromPathDataCommands",
    category: "SVG",
    code: `// path_data: the "d" attribute, e.g. "M10 10 C 20 20, 40 20, 50 10"
return {
  output: {
    name: "path",
    attributes: {
      d: inputs.path_data,
      fill: inputs.fill,
      stroke: inputs.stroke,
      "stroke-width": inputs.stroke_width
    }
  }
};`,
    tags: ["path", "curve", "bezier", "d", "shape", "vector", "svg", "icon"],
    inputs: {
      path_data: {
        type: "str",
        default: "",
        description: 'The "d" attribute, e.g. "M10 10 C 20 20, 40 20, 50 10"'
      },
      fill: { type: "color", default: "#000000" },
      stroke: { type: "color", default: "#000000" },
      stroke_width: { type: "float", default: 1, min: 0 }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-text",
    title: "Text Element",
    titleKey: "textElement",
    description: "SVG text element with font, size, color, and anchor",
    descriptionKey: "svgTextElementWithFontSizeColorAndAnchor",
    category: "SVG",
    code: `// text_anchor: start | middle | end. Content is escaped when the
// document is serialized, so pass it through raw.
return {
  output: {
    name: "text",
    attributes: {
      x: inputs.x, y: inputs.y,
      "font-family": inputs.font_family,
      "font-size": inputs.font_size,
      fill: inputs.fill,
      "text-anchor": inputs.text_anchor
    },
    content: inputs.text
  }
};`,
    tags: ["text", "label", "typography", "font", "caption", "vector", "svg"],
    inputs: {
      x: { type: "int", default: 0 },
      y: { type: "int", default: 0 },
      text: { type: "str", default: "" },
      font_family: { type: "str", default: "sans-serif" },
      font_size: { type: "int", default: 16, min: 1 },
      fill: { type: "color", default: "#000000" },
      text_anchor: {
        type: "str",
        default: "start",
        description: "start | middle | end",
        descriptionKey: "startMiddleEnd"
      }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-gaussian-blur",
    title: "Gaussian Blur Filter",
    titleKey: "gaussianBlurFilter",
    description: "SVG blur filter definition, referenced by filter=url(#id)",
    descriptionKey: "svgBlurFilterDefinitionReferencedByFilterurlid",
    category: "SVG",
    code: `const id = "blur1"; // elements reference it as filter="url(#blur1)"
return {
  output: {
    name: "filter",
    attributes: { id },
    children: [
      { name: "feGaussianBlur", attributes: { stdDeviation: inputs.std_deviation } }
    ]
  }
};`,
    tags: ["blur", "gaussian", "filter", "effects", "soften", "svg", "vector"],
    inputs: {
      std_deviation: { type: "float", default: 3, min: 0 }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-drop-shadow",
    title: "Drop Shadow Filter",
    titleKey: "dropShadowFilter",
    description:
      "SVG drop shadow filter definition, referenced by filter=url(#id)",
    category: "SVG",
    code: `const id = "shadow1"; // elements reference it as filter="url(#shadow1)"
return {
  output: {
    name: "filter",
    attributes: { id },
    children: [
      {
        name: "feGaussianBlur",
        attributes: { in: "SourceAlpha", stdDeviation: inputs.std_deviation }
      },
      { name: "feOffset", attributes: { dx: inputs.dx, dy: inputs.dy } },
      { name: "feFlood", attributes: { "flood-color": inputs.color } },
      { name: "feComposite", attributes: { operator: "in", in2: "SourceAlpha" } },
      {
        name: "feMerge",
        children: [
          { name: "feMergeNode" },
          { name: "feMergeNode", attributes: { in: "SourceGraphic" } }
        ]
      }
    ]
  }
};`,
    tags: [
      "shadow",
      "drop shadow",
      "filter",
      "effects",
      "depth",
      "elevation",
      "svg",
      "vector"
    ],
    inputs: {
      std_deviation: { type: "float", default: 3, min: 0 },
      dx: { type: "int", default: 2 },
      dy: { type: "int", default: 2 },
      color: { type: "color", default: "#000000" }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-gradient",
    title: "Gradient",
    description:
      "Linear or radial gradient definition, referenced by fill=url(#id)",
    category: "SVG",
    code: `const id = "grad1"; // elements reference it as fill="url(#grad1)"
const radial = false; // true for a radial gradient
return {
  output: {
    name: radial ? "radialGradient" : "linearGradient",
    attributes: radial
      ? { id, cx: inputs.x1 + "%", cy: inputs.y1 + "%", r: inputs.x2 + "%" }
      : { id, x1: inputs.x1 + "%", y1: inputs.y1 + "%", x2: inputs.x2 + "%", y2: inputs.y2 + "%" },
    children: [
      {
        name: "stop",
        attributes: {
          offset: "0%",
          style: "stop-color:" + inputs.color1 + ";stop-opacity:1"
        }
      },
      {
        name: "stop",
        attributes: {
          offset: "100%",
          style: "stop-color:" + inputs.color2 + ";stop-opacity:1"
        }
      }
    ]
  }
};`,
    tags: [
      "gradient",
      "linear",
      "radial",
      "color",
      "fill",
      "stops",
      "svg",
      "vector"
    ],
    inputs: {
      x1: { type: "float", default: 0, min: 0, max: 100 },
      y1: { type: "float", default: 0, min: 0, max: 100 },
      x2: { type: "float", default: 100, min: 0, max: 100 },
      y2: { type: "float", default: 0, min: 0, max: 100 },
      color1: { type: "color", default: "#000000" },
      color2: { type: "color", default: "#ffffff" }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-transform",
    title: "Transform",
    description: "Translate, rotate, and scale an SVG element",
    descriptionKey: "translateRotateAndScaleAnSVGElement",
    category: "SVG",
    code: `const parts = [];
if (inputs.translate_x || inputs.translate_y) {
  parts.push("translate(" + inputs.translate_x + "," + inputs.translate_y + ")");
}
if (inputs.rotate) parts.push("rotate(" + inputs.rotate + ")");
if (inputs.scale_x !== 1 || inputs.scale_y !== 1) {
  parts.push("scale(" + inputs.scale_x + "," + inputs.scale_y + ")");
}
const attributes = { ...inputs.content.attributes };
if (parts.length) attributes.transform = parts.join(" ");
return { output: { ...inputs.content, attributes } };`,
    tags: [
      "transform",
      "translate",
      "rotate",
      "scale",
      "move",
      "svg",
      "vector"
    ],
    inputs: {
      content: { type: "svg_element" },
      translate_x: { type: "float", default: 0 },
      translate_y: { type: "float", default: 0 },
      rotate: { type: "float", default: 0, min: -360, max: 360 },
      scale_x: { type: "float", default: 1 },
      scale_y: { type: "float", default: 1 }
    },
    outputs: { output: "svg_element" }
  },
  {
    id: "svg-clip-path",
    title: "Clip Path",
    titleKey: "clipPath",
    description: "Clip an SVG element with the shape of another element",
    descriptionKey: "clipAnSVGElementWithTheShapeOfAnotherElement",
    category: "SVG",
    code: `const id = "clip1";
return {
  output: {
    name: "g",
    children: [
      { name: "clipPath", attributes: { id }, children: [inputs.clip_content] },
      {
        ...inputs.content,
        attributes: { ...inputs.content.attributes, "clip-path": "url(#" + id + ")" }
      }
    ]
  }
};`,
    tags: ["clip", "clip path", "mask", "crop", "shape", "svg", "vector"],
    inputs: {
      content: { type: "svg_element" },
      clip_content: {
        type: "svg_element",
        description: "Element whose shape clips `content`",
        descriptionKey: "elementWhoseShapeClipsContent"
      }
    },
    outputs: { output: "svg_element" }
  },

  // ---------------------------------------------------------------------------
  // HTTP (replaces lib.http.* and lib.graphql.* nodes)
  // ---------------------------------------------------------------------------
  {
    id: "http-get-text",
    title: "GET Text",
    titleKey: "getText",
    description: "Fetch text content from a URL",
    descriptionKey: "fetchTextContentFromAURL",
    category: "HTTP",
    code: `const res = await fetch(inputs.url, { headers: { ...inputs.headers } });
return { output: await res.text(), status: res.status };`,
    tags: ["http", "get", "text", "fetch", "request", "api", "url", "download"]
  },
  {
    id: "http-get-json",
    title: "GET JSON",
    description: "Fetch and parse JSON from a URL",
    descriptionKey: "fetchAndParseJSONFromAURL",
    category: "HTTP",
    code: `const res = await fetch(inputs.url, { headers: { Accept: "application/json", ...inputs.headers } });
if (res.json === undefined) throw new Error("Response is not JSON (status " + res.status + ")");
return { output: res.json, status: res.status };`,
    tags: ["http", "get", "json", "fetch", "request", "api", "rest", "parse"]
  },
  {
    id: "http-get-bytes",
    title: "GET Bytes",
    titleKey: "getBytes",
    description: "Download binary data from a URL as a Uint8Array",
    descriptionKey: "downloadBinaryDataFromAURLAsAUint8Array",
    category: "HTTP",
    code: `const res = await fetch(inputs.url, { headers: { ...inputs.headers } });
return { output: await res.bytes(), status: res.status };`,
    tags: [
      "http",
      "get",
      "bytes",
      "binary",
      "download",
      "fetch",
      "request",
      "api"
    ]
  },
  {
    id: "http-post",
    title: "POST JSON",
    description: "Send a POST request with a JSON body",
    descriptionKey: "sendAPOSTRequestWithAJSONBody",
    category: "HTTP",
    code: `const res = await fetch(inputs.url, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...inputs.headers },
  body: JSON.stringify(inputs.body)
});
return { output: res.json === undefined ? res.body : res.json, status: res.status };`,
    tags: ["http", "post", "json", "send", "request", "api", "rest", "submit"]
  },
  {
    id: "http-put",
    title: "PUT JSON",
    description: "Send a PUT request with a JSON body",
    descriptionKey: "sendAPUTRequestWithAJSONBody",
    category: "HTTP",
    code: `const res = await fetch(inputs.url, {
  method: "PUT",
  headers: { "Content-Type": "application/json", ...inputs.headers },
  body: JSON.stringify(inputs.body)
});
return { output: res.json === undefined ? res.body : res.json, status: res.status };`,
    tags: ["http", "put", "update", "replace", "request", "api", "rest", "json"]
  },
  {
    id: "http-patch",
    title: "PATCH JSON",
    description: "Send a PATCH request with a JSON body",
    descriptionKey: "sendAPATCHRequestWithAJSONBody",
    category: "HTTP",
    code: `const res = await fetch(inputs.url, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", ...inputs.headers },
  body: JSON.stringify(inputs.body)
});
return { output: res.json === undefined ? res.body : res.json, status: res.status };`,
    tags: [
      "http",
      "patch",
      "update",
      "modify",
      "request",
      "api",
      "rest",
      "json"
    ]
  },
  {
    id: "http-delete",
    title: "DELETE",
    description: "Send a DELETE request and report whether it succeeded",
    descriptionKey: "sendADELETERequestAndReportWhetherItSucceeded",
    category: "HTTP",
    code: `const res = await fetch(inputs.url, { method: "DELETE", headers: { ...inputs.headers } });
return { output: res.ok, status: res.status };`,
    tags: ["http", "delete", "remove", "destroy", "request", "api", "rest"]
  },
  {
    id: "http-bearer-auth",
    title: "Request with Bearer Token",
    titleKey: "requestWithBearerToken",
    description: "Call an API with a bearer token read from the secret store",
    descriptionKey: "callAnAPIWithABearerTokenReadFromTheSecretStore",
    category: "HTTP",
    code: `// Rename the secret to whatever you stored under Settings -> Secrets
const token = await getSecret("API_TOKEN");
const res = await fetch(inputs.url, {
  headers: { Accept: "application/json", Authorization: "Bearer " + token }
});
return { output: res.json === undefined ? res.body : res.json, status: res.status };`,
    tags: [
      "http",
      "auth",
      "bearer",
      "token",
      "secret",
      "api",
      "request",
      "header"
    ]
  },
  {
    id: "http-graphql-query",
    title: "GraphQL Query",
    titleKey: "graphqlQuery",
    description: "Run a GraphQL query or mutation against any endpoint",
    descriptionKey: "runAGraphQLQueryOrMutationAgainstAnyEndpoint",
    category: "HTTP",
    code: `// Add operationName here for multi-operation documents
const res = await fetch(inputs.url, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ query: inputs.query, variables: inputs.variables })
});
const json = res.json ?? {};
return { data: json.data ?? null, errors: json.errors ?? [], status: res.status };`,
    tags: [
      "graphql",
      "query",
      "mutation",
      "api",
      "post",
      "http",
      "request",
      "gql"
    ]
  },
  {
    id: "http-graphql-auth",
    title: "GraphQL Query with Auth",
    titleKey: "graphqlQueryWithAuth",
    description:
      "Run a GraphQL query with a bearer token from the secret store",
    category: "HTTP",
    code: `const reqHeaders = { "Content-Type": "application/json", Accept: "application/json" };
const token = await getSecret("GRAPHQL_AUTH_TOKEN");
if (token) reqHeaders.Authorization = "Bearer " + token;
const res = await fetch(inputs.url, {
  method: "POST",
  headers: reqHeaders,
  body: JSON.stringify({ query: inputs.query, variables: inputs.variables })
});
const json = res.json ?? {};
return { data: json.data ?? null, errors: json.errors ?? [], status: res.status };`,
    tags: [
      "graphql",
      "query",
      "mutation",
      "api",
      "auth",
      "bearer",
      "token",
      "secret",
      "http"
    ]
  },
  {
    id: "http-graphql-batch",
    title: "GraphQL Batch Query",
    titleKey: "graphqlBatchQuery",
    description: "Send several GraphQL operations in one batched request",
    descriptionKey: "sendSeveralGraphQLOperationsInOneBatchedRequest",
    category: "HTTP",
    code: `// queries: [{ query, variables?, operationName? }, ...]
const res = await fetch(inputs.url, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify(inputs.queries)
});
const json = res.json ?? [];
return { output: Array.isArray(json) ? json : [json], status: res.status };`,
    tags: [
      "graphql",
      "batch",
      "bulk",
      "query",
      "mutation",
      "api",
      "http",
      "multiple"
    ]
  },
  {
    id: "http-graphql-introspection",
    title: "GraphQL Introspection",
    titleKey: "graphqlIntrospection",
    description: "Fetch a GraphQL endpoint's schema via an introspection query",
    descriptionKey: "fetchAGraphQLEndpointsSchemaViaAnIntrospectionQuery",
    category: "HTTP",
    code: `const query = "{ __schema { queryType { name } mutationType { name } subscriptionType { name } " +
  "types { name kind fields { name type { name kind ofType { name kind } } } } } }";
const res = await fetch(inputs.url, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ query })
});
const schema = res.json?.data?.__schema ?? null;
return { output: res.json ?? {}, types: schema ? schema.types.map(t => t.name) : [] };`,
    tags: [
      "graphql",
      "introspection",
      "schema",
      "types",
      "api",
      "http",
      "discover"
    ]
  },

  // ---------------------------------------------------------------------------
  // Markdown
  // ---------------------------------------------------------------------------
  {
    id: "md-extract-headers",
    title: "Extract Headers",
    titleKey: "extractHeaders",
    description: "Extract markdown headers as an outline (level, text, index)",
    descriptionKey: "extractMarkdownHeadersAsAnOutlineLevelTextIndex",
    category: "Markdown",
    code: `const maxLevel = 6; // deepest header level to keep (1-6)
const headers = [];
for (const line of String(inputs.markdown).split("\\n")) {
  const m = line.match(/^(#{1,6})\\s+(.+)$/);
  if (m && m[1].length <= maxLevel) {
    headers.push({ level: m[1].length, text: m[2].trim(), index: headers.length });
  }
}
return { output: headers };`,
    tags: [
      "markdown",
      "headers",
      "heading",
      "outline",
      "structure",
      "table of contents",
      "toc",
      "extract"
    ]
  },
  {
    id: "md-extract-links",
    title: "Extract Links",
    titleKey: "extractLinks",
    description: "Extract inline links and autolinks from markdown",
    descriptionKey: "extractInlineLinksAndAutolinksFromMarkdown",
    category: "Markdown",
    code: `const includeTitles = true; // keep the [text] part as the link title
const links = [];
// Autolinks need a scheme so inline HTML like <div> is not read as a link.
const pattern = /\\[([^\\]]+)\\]\\(([^)]+)\\)|<([a-zA-Z][a-zA-Z0-9+.-]*:[^>\\s]+)>/g;
for (const m of String(inputs.markdown).matchAll(pattern)) {
  if (m[1] && m[2]) links.push({ url: m[2], title: includeTitles ? m[1] : "" });
  else if (m[3]) links.push({ url: m[3], title: "" });
}
return { output: links };`,
    tags: ["markdown", "links", "urls", "references", "citations", "extract"]
  },
  {
    id: "md-extract-code-blocks",
    title: "Extract Code Blocks",
    titleKey: "extractCodeBlocks",
    description: "Extract fenced code blocks and their languages from markdown",
    descriptionKey: "extractFencedCodeBlocksAndTheirLanguagesFromMarkdown",
    category: "Markdown",
    code: `const blocks = [];
for (const m of String(inputs.markdown).matchAll(/\`\`\`(\\w*)\\n([\\s\\S]*?)\\n\`\`\`/g)) {
  blocks.push({ language: m[1] || "text", code: m[2].trim() });
}
return { output: blocks };`,
    tags: [
      "markdown",
      "code blocks",
      "code",
      "fenced",
      "language",
      "snippets",
      "extract"
    ]
  },
  {
    id: "md-extract-bullet-lists",
    title: "Extract Bullet Lists",
    titleKey: "extractBulletLists",
    description: "Extract unordered lists from markdown, grouped per list",
    descriptionKey: "extractUnorderedListsFromMarkdownGroupedPerList",
    category: "Markdown",
    code: `const lists = [];
let current = [];
for (const line of String(inputs.markdown).split("\\n")) {
  const m = line.match(/^\\s*[-*+]\\s+(.+)$/);
  if (m) current.push({ text: m[1].trim() });
  else if (current.length) { lists.push(current); current = []; }
}
if (current.length) lists.push(current);
return { output: lists };`,
    tags: [
      "markdown",
      "lists",
      "bullets",
      "bullet lists",
      "unordered",
      "items",
      "extract"
    ]
  },
  {
    id: "md-extract-numbered-lists",
    title: "Extract Numbered Lists",
    titleKey: "extractNumberedLists",
    description: "Extract ordered lists from markdown, grouped per list",
    descriptionKey: "extractOrderedListsFromMarkdownGroupedPerList",
    category: "Markdown",
    code: `const lists = [];
let current = [];
for (const line of String(inputs.markdown).split("\\n")) {
  const m = line.match(/^\\s*\\d+\\.\\s+(.+)$/);
  if (m) current.push(m[1].trim());
  else if (current.length) { lists.push(current); current = []; }
}
if (current.length) lists.push(current);
return { output: lists };`,
    tags: [
      "markdown",
      "lists",
      "numbered",
      "ordered",
      "enumerated",
      "steps",
      "extract"
    ]
  },
  {
    id: "md-extract-tables",
    title: "Extract Table",
    titleKey: "extractTable",
    description: "Convert the first markdown table into dataframe rows",
    descriptionKey: "convertTheFirstMarkdownTableIntoDataframeRows",
    category: "Markdown",
    code: `const table = [];
for (const line of String(inputs.markdown).split("\\n")) {
  if (line.includes("|")) {
    table.push(line.split("|").slice(1, -1).map(c => c.trim()));
  } else if (table.length) break;
}
if (table.length < 2) return { output: { rows: [] } };
const headers = table[0];
// Skip row 2 only when it really is the |---|---| separator.
const body = table.slice(table[1].every(c => /^:?-+:?$/.test(c)) ? 2 : 1);
const rows = body.map(r =>
  Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))
);
return { output: { rows } };`,
    tags: [
      "markdown",
      "tables",
      "table",
      "dataframe",
      "rows",
      "tabular",
      "data",
      "extract"
    ]
  },

  // ---------------------------------------------------------------------------
  // HTML
  // ---------------------------------------------------------------------------
  {
    id: "html-base-url",
    title: "Base URL",
    description: "Extract scheme + host (the site root) from a full URL",
    descriptionKey: "extractSchemeHostTheSiteRootFromAFullURL",
    category: "HTML",
    code: `const parsed = new URL(inputs.url);
return { output: parsed.protocol + "//" + parsed.host };`,
    tags: [
      "base url",
      "url",
      "domain",
      "host",
      "origin",
      "root",
      "parse",
      "web"
    ]
  },
  {
    id: "html-extract-links",
    title: "Extract Links",
    titleKey: "extractLinks",
    description:
      "Extract every <a href> with its text, classified internal or external",
    category: "HTML",
    code: `import { select } from "@nodetool-ai/sandbox-html";
const baseUrl = ""; // page URL — decides internal vs external
const hrefs = await select(inputs.html, "a[href]", { attr: "href", limit: 1000 });
const texts = await select(inputs.html, "a[href]", { limit: 1000 });
const isInternal = (href) => {
  if (!href || href.startsWith("#")) return true;
  if (/^(mailto|tel|javascript):/i.test(href)) return false;
  if (baseUrl) {
    try {
      return new URL(href, baseUrl).origin === new URL(baseUrl).origin;
    } catch {
      // Unparseable href/base — fall through to the scheme heuristic.
    }
  }
  return !/^[a-z][a-z0-9+.-]*:|^\\/\\//i.test(href);
};
const links = hrefs.map((href, i) => ({
  href,
  text: texts[i] ?? "",
  type: isInternal(href) ? "internal" : "external"
}));
return { links, href: links[0]?.href ?? "", text: links[0]?.text ?? "" };`,
    tags: [
      "html",
      "links",
      "urls",
      "anchor",
      "href",
      "internal",
      "external",
      "web scraping",
      "extract"
    ]
  },
  {
    id: "html-extract-images",
    title: "Extract Images",
    titleKey: "extractImages",
    description:
      "Collect every <img src> from HTML, resolved against a base URL",
    category: "HTML",
    code: `import { select } from "@nodetool-ai/sandbox-html";
const baseUrl = ""; // page URL — resolves relative src values
const srcs = await select(inputs.html, "img[src]", { attr: "src", limit: 1000 });
const resolve = (s) => {
  try { return new URL(s, baseUrl || undefined).href; } catch { return s; }
};
const images = srcs.map(s => ({ uri: resolve(s), type: "image" }));
return { images, image: images[0] ?? { uri: "", type: "image" } };`,
    tags: [
      "html",
      "images",
      "img",
      "src",
      "pictures",
      "gallery",
      "web scraping",
      "extract"
    ]
  },
  {
    id: "html-extract-audio",
    title: "Extract Audio",
    titleKey: "extractAudio",
    description: "Collect <audio> and <audio><source> sources from HTML",
    descriptionKey: "collectAudioAndAudiosourceSourcesFromHTML",
    category: "HTML",
    code: `import { select } from "@nodetool-ai/sandbox-html";
const baseUrl = ""; // page URL — resolves relative src values
const srcs = await select(inputs.html, "audio[src], audio source[src]", {
  attr: "src",
  limit: 1000
});
const resolve = (s) => {
  try { return new URL(s, baseUrl || undefined).href; } catch { return s; }
};
const audios = srcs.map(s => ({ uri: resolve(s), type: "audio" }));
return { audios, audio: audios[0] ?? { uri: "", type: "audio" } };`,
    tags: [
      "html",
      "audio",
      "sound",
      "src",
      "media",
      "playlist",
      "web scraping",
      "extract"
    ]
  },
  {
    id: "html-extract-videos",
    title: "Extract Videos",
    titleKey: "extractVideos",
    description:
      "Collect <video>, <video><source> and <iframe> sources from HTML",
    category: "HTML",
    code: `import { select } from "@nodetool-ai/sandbox-html";
const baseUrl = ""; // page URL — resolves relative src values
const srcs = await select(
  inputs.html,
  "video[src], video source[src], iframe[src]",
  { attr: "src", limit: 1000 }
);
const resolve = (s) => {
  try { return new URL(s, baseUrl || undefined).href; } catch { return s; }
};
const videos = srcs.map(s => ({ uri: resolve(s), type: "video" }));
return { videos, video: videos[0] ?? { uri: "", type: "video" } };`,
    tags: [
      "html",
      "videos",
      "video",
      "iframe",
      "embed",
      "media",
      "src",
      "web scraping",
      "extract"
    ]
  },
  {
    id: "html-extract-metadata",
    title: "Extract Metadata",
    titleKey: "extractMetadata",
    description: "Read the page title and the description / keywords meta tags",
    descriptionKey: "readThePageTitleAndTheDescriptionKeywordsMetaTags",
    category: "HTML",
    code: `import { select } from "@nodetool-ai/sandbox-html";
const first = async (selector, attr) =>
  (await select(inputs.html, selector, attr ? { attr, limit: 1 } : { limit: 1 }))[0] ?? null;
return {
  title: (await first("title")) || null,
  description: await first('meta[name="description"]', "content"),
  keywords: await first('meta[name="keywords"]', "content")
};`,
    tags: [
      "html",
      "metadata",
      "meta",
      "seo",
      "title",
      "description",
      "keywords",
      "page info",
      "extract"
    ]
  },

  // ---------------------------------------------------------------------------
  // Validation (replaces the lib.validate nodes)
  // ---------------------------------------------------------------------------
  {
    id: "validate-email",
    title: "Validate Email",
    titleKey: "validateEmail",
    description: "Check whether a value is a syntactically valid email address",
    descriptionKey: "checkWhetherAValueIsASyntacticallyValidEmailAddress",
    category: "Validation",
    code: `return { output: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z][A-Za-z0-9-]*$/.test(String(inputs.value).trim()) };`,
    tags: ["validate", "email", "check", "address", "valid"]
  },
  {
    id: "validate-url",
    title: "Validate URL",
    titleKey: "validateURL",
    description: "Check whether a value is a syntactically valid absolute URL",
    descriptionKey: "checkWhetherAValueIsASyntacticallyValidAbsoluteURL",
    category: "Validation",
    code: `let ok = false;
try {
  const u = new URL(inputs.value);
  ok = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(inputs.value) && u.host.length > 0;
} catch (e) {
  ok = false;
}
return { output: ok };`,
    tags: ["validate", "url", "link", "check", "http", "uri"]
  },
  {
    id: "validate-ip",
    title: "Validate IP Address",
    titleKey: "validateIPAddress",
    description: "Check whether a value is a valid IPv4 or IPv6 address",
    descriptionKey: "checkWhetherAValueIsAValidIPv4OrIPv6Address",
    category: "Validation",
    code: `const v = String(inputs.value);
const SEG = /^(25[0-5]|2[0-4]\\d|1\\d\\d|\\d{1,2})$/;
const isIPv4 = (s) => {
  const parts = s.split(".");
  return parts.length === 4 && parts.every((p) => SEG.test(p));
};
const isIPv6 = (s) => {
  if (s.indexOf(":") === -1) return false;
  let t = s;
  const m = /^(.*:)(\\d{1,3}(?:\\.\\d{1,3}){3})$/.exec(t);
  if (m) {
    if (!isIPv4(m[2])) return false;
    t = m[1] + "0:0";
  }
  const isGroup = (p) => /^[0-9a-fA-F]{1,4}$/.test(p);
  const halves = t.split("::");
  if (halves.length > 2) return false;
  if (halves.length === 2) {
    const left = halves[0] === "" ? [] : halves[0].split(":");
    const right = halves[1] === "" ? [] : halves[1].split(":");
    return [...left, ...right].every(isGroup) && left.length + right.length <= 7;
  }
  const parts = t.split(":");
  return parts.length === 8 && parts.every(isGroup);
};
const v4 = isIPv4(v), v6 = isIPv6(v);
return { is_ip: v4 || v6, is_ipv4: v4, is_ipv6: v6 };`,
    tags: ["validate", "ip", "ipv4", "ipv6", "address", "network", "check"]
  },
  {
    id: "validate-string",
    title: "Validate String",
    titleKey: "validateString",
    description:
      "Run common string checks at once and return one bool per check",
    category: "Validation",
    code: `const v = String(inputs.value);
let isUrl = false;
try {
  isUrl = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v) && new URL(v).host.length > 0;
} catch (e) {
  isUrl = false;
}
let isJson = true;
try {
  JSON.parse(v);
} catch (e) {
  isJson = false;
}
return {
  is_email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z][A-Za-z0-9-]*$/.test(v.trim()),
  is_url: isUrl,
  is_uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
  is_json: isJson,
  is_numeric: v.trim() !== "" && !Number.isNaN(Number(v)),
  is_alpha: /^[A-Za-z]+$/.test(v),
  is_alphanumeric: /^[A-Za-z0-9]+$/.test(v)
};`,
    tags: [
      "validate",
      "check",
      "string",
      "email",
      "url",
      "uuid",
      "json",
      "numeric",
      "alpha",
      "alphanumeric"
    ]
  },
  {
    id: "validate-sanitize",
    title: "Sanitize String",
    titleKey: "sanitizeString",
    description:
      "HTML-escape and trim a string, plus the normalized email when applicable",
    category: "Validation",
    code: `const v = String(inputs.value);
const trimmed = v.trim();
const lowered = trimmed.toLowerCase();
const isEmail = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z][A-Za-z0-9-]*$/.test(lowered);
return {
  escaped: v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\\//g, "&#x2F;"),
  trimmed,
  normalized_email: isEmail ? lowered : ""
};`,
    tags: [
      "sanitize",
      "escape",
      "html",
      "xss",
      "clean",
      "trim",
      "normalize",
      "email"
    ]
  },
  // ---------------------------------------------------------------------------
  // Email — the replacement for the retired `lib.mail.*` nodes.
  //
  // These call the `google` capability module, so the OAuth session stays on
  // the host and the guest never holds a token. The retired nodes spoke IMAP
  // with a Gmail app password; this path needs only the user's Google sign-in.
  // ---------------------------------------------------------------------------
  {
    id: "gmail-search",
    title: "Gmail Search",
    titleKey: "gmailSearch",
    description:
      "Search Gmail and return the matching messages (id, subject, from, date, snippet, body)",
    category: "Email",
    code: `import { gmail_search } from "@nodetool-ai/sandbox-nodetool/google";

const { messages } = await gmail_search({
  query: inputs.query,
  max_results: inputs.max_results
});
return { messages };`,
    tags: ["gmail", "mail", "email", "search", "inbox", "google", "fetch"],
    inputs: {
      query: { type: "str", default: "newer_than:2d" },
      max_results: { type: "int", default: 10, min: 1, max: 50 }
    },
    outputs: { messages: "list" }
  },
  {
    id: "gmail-add-label",
    title: "Gmail Add Label",
    titleKey: "gmailAddLabel",
    description: "Apply a Gmail label to one message by id",
    descriptionKey: "applyAGmailLabelToOneMessageById",
    category: "Email",
    code: `import { gmail_modify_labels } from "@nodetool-ai/sandbox-nodetool/google";

await gmail_modify_labels({
  message_id: inputs.message_id,
  add_label_ids: [inputs.label]
});
return { message_id: inputs.message_id };`,
    tags: ["gmail", "mail", "email", "label", "tag", "google", "categorize"],
    inputs: {
      message_id: { type: "str", default: "" },
      label: { type: "str", default: "" }
    },
    outputs: { message_id: "str" }
  },
  {
    id: "gmail-archive",
    title: "Gmail Archive",
    titleKey: "gmailArchive",
    description: "Archive a Gmail message by removing it from the inbox",
    descriptionKey: "archiveAGmailMessageByRemovingItFromTheInbox",
    category: "Email",
    code: `import { gmail_modify_labels } from "@nodetool-ai/sandbox-nodetool/google";

// Archiving in Gmail is removing the INBOX label — there is no archive call.
await gmail_modify_labels({
  message_id: inputs.message_id,
  remove_label_ids: ["INBOX"]
});
return { message_id: inputs.message_id };`,
    tags: ["gmail", "mail", "email", "archive", "inbox", "google"],
    inputs: { message_id: { type: "str", default: "" } },
    outputs: { message_id: "str" }
  },

  // ---------------------------------------------------------------------------
  // Image — the replacement for the retired `lib.grid.CombineImageGrid` node.
  // ---------------------------------------------------------------------------
  {
    id: "image-grid",
    title: "Combine Image Grid",
    titleKey: "combineImageGrid",
    description:
      "Lay a list of images out in a grid and return the combined image",
    category: "Image",
    code: `// image.grid sizes every cell to the largest input, so the grid stays
// aligned when the tiles differ in size.
const bytes = await image.grid(inputs.tiles, { columns: inputs.columns });
return { output: await media.toImage(bytes) };`,
    tags: ["image", "grid", "combine", "montage", "tile", "collage", "merge"],
    inputs: {
      tiles: { type: "list", default: [] },
      columns: { type: "int", default: 2, min: 1 }
    },
    outputs: { output: "any" }
  }
];
