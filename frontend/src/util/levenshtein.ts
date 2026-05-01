

export function levenshtein(a: string, b: string): number {
    const lenA = a.length;
    const lenB = b.length;

    // Create a 2D array (matrix)
    const dp: number[][] = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= lenA; i++) dp[i][0] = i;
    for (let j = 0; j <= lenB; j++) dp[0][j] = j;

    // Fill in the matrix
    for (let i = 1; i <= lenA; i++) {
        for (let j = 1; j <= lenB; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1]; // No operation needed
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,     // Deletion
                    dp[i][j - 1] + 1,     // Insertion
                    dp[i - 1][j - 1] + 1  // Substitution
                );
            }
        }
    }

    return dp[lenA][lenB];
}

export function getSuggestionsSimilar(allowedStrings: string[], targetString: string): string[] {
    if (allowedStrings.length == 0) return [];
    let matches = allowedStrings.map(stringValue => ({
        stringValue,
        distance: levenshtein(stringValue, targetString),
    }))
    matches.sort((a, b) => a.distance - b.distance);
    const minDistance = matches[0].distance;
    return matches.filter(match => match.distance <= minDistance + 1E-99).map(match => match.stringValue);
}