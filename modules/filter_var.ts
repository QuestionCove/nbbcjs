// TypeScript implementation of a filter_var function
export default function filter_var(value: any, flags: 'FILTER_VALIDATE_INT' | 'FILTER_VALIDATE_FLOAT' | 'FILTER_VALIDATE_EMAIL' | 'FILTER_VALIDATE_URL' | 'FILTER_VALIDATE_IP'): any {
    const filters: { [key: string]: RegExp } = {
        int: /^-?\d+$/,
        float: /^-?\d+(\.\d+)?$/,
        email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        url: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
        ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
        //ip: /^(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::\d{1,5})?)|(?:\[(?:(?:(?:[A-F0-9]{1,4}:){6}(?:[A-F0-9]{1,4}:[A-F0-9]{1,4}|(?::[0-9]{1,5})?))|(?:(?:[A-F0-9]{1,4}:){5}(?::[A-F0-9]{1,4})?:[A-F0-9]{1,4})|(?:(?:[A-F0-9]{1,4}:){4}(?::[A-F0-9]{1,4}){0,2}:?[A-F0-9]{1,4})|(?:(?:[A-F0-9]{1,4}:){3}(?::[A-F0-9]{1,4}){0,3}:?[A-F0-9]{1,4})|(?:(?:[A-F0-9]{1,4}:){2}(?::[A-F0-9]{1,4}){0,4}:?[A-F0-9]{1,4})|(?:(?:[A-F0-9]{1,4}:){1}(?::[A-F0-9]{1,4}){0,5}:?[A-F0-9]{1,4})|(?::(?::[A-F0-9]{1,4}){0,6}:?[A-F0-9]{1,4})?)(?::\d{1,5})?)\](?:\/[^\s]*)?$/
    };
  
    if (flags == 'FILTER_VALIDATE_INT' && filters.int.test(value)) {
        return parseInt(value, 10);
    }
  
    if (flags == 'FILTER_VALIDATE_FLOAT' && filters.float.test(value)) {
        return parseFloat(value);
    }
  
    if (flags == 'FILTER_VALIDATE_EMAIL' && filters.email.test(value)) {
        return value;
    }
  
    if (flags == 'FILTER_VALIDATE_URL' && filters.url.test(value)) {
        return value;
    }

    if (flags == 'FILTER_VALIDATE_IP' && filters.ip.test(value)) {
        return value;
    }
  
    return null;
}