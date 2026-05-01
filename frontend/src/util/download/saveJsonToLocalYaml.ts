
import { dump as dumpYaml } from 'js-yaml';


export function saveJsonToLocalYaml(obj: any, fileName: string) {
    const yamlString = dumpYaml(obj);

    const blob = new Blob([yamlString], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url); // Clean up
}