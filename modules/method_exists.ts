export default function method_exists(obj: object, methodName: string): boolean {
    return methodName in obj && typeof obj[methodName] === 'function';
}