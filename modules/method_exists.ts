export default function method_exists(obj: Record<any, any>, methodName: string): boolean {
    return methodName in obj && typeof obj[methodName] === 'function';
}