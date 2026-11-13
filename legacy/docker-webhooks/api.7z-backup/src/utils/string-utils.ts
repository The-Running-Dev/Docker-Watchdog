export class StringUtils {
    static formatStatus(status: string): string {
        const cleanedStatus = status.replace(/\(.*?\)/g, '');
        
        return cleanedStatus.charAt(0).toUpperCase() + cleanedStatus.slice(1);
    }
}
