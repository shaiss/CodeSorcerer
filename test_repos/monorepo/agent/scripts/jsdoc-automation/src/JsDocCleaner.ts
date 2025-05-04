/**
 * Utility class for cleaning and validating JSDoc comments.
 */
export class JsDocCleaner {
    /**
     * Processes and cleans a JSDoc comment to ensure proper formatting.
     * 
     * @param {string} comment - The JSDoc comment to clean.
     * @returns {string} The cleaned JSDoc comment.
     */
    public static clean(comment: string): string {
        // Remove any empty lines at start/end
        let cleaned = comment.trim();

        // Ensure comment starts with /**
        if (!cleaned.startsWith('/**')) {
            cleaned = '/**' + cleaned.replace(/^\/\*+/, '');
        }

        // Fix common artifacts:
        // 1. Multiple closing patterns
        cleaned = cleaned.replace(/\*+\s*\*+\s*\/$/, '*/');
        cleaned = cleaned.replace(/\*+\s*\/$/, '*/');
        
        // 2. Fix improper closing
        if (!cleaned.endsWith('*/')) {
            cleaned = cleaned + ' */';
        }

        // 3. Fix spacing in content
        cleaned = cleaned.split('\n').map((line, index) => {
            // First line should just have /**
            if (index === 0) {
                return '/**';
            }
            
            // Clean up any extra asterisks in the content
            line = line.trim().replace(/^\*+\s*/, ' * ');
            
            // Ensure there's a space after the asterisk if it's a content line
            if (line.startsWith(' *') && !line.startsWith(' * ')) {
                line = ' * ' + line.substring(2).trimStart();
            }
            
            return line;
        }).join('\n');

        // 4. Fix final spacing
        cleaned = cleaned.replace(/\s*\*\//, '\n */');

        // Validate basic structure
        const isValid = 
            cleaned.startsWith('/**') && 
            cleaned.endsWith('*/') &&
            cleaned.includes('\n');

        if (!isValid) {
            // If validation fails, create a minimal valid structure
            cleaned = '/**\n * ' + cleaned.replace(/\/\*+|\*+\//g, '').trim() + '\n */';
        }

        return cleaned;
    }

    /**
     * Validates if a JSDoc comment has proper structure.
     * 
     * @param {string} comment - The JSDoc comment to validate.
     * @returns {boolean} True if the comment has valid structure.
     */
    public static isValid(comment: string): boolean {
        return (
            comment.startsWith('/**') &&
            comment.endsWith('*/') &&
            comment.includes('\n') &&
            !comment.includes('**/')
        );
    }
}
