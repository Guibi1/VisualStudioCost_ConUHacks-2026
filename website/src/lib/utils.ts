import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function generateTeamJoinCode() {
    const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
    const vowels = "AEIOU";
    const codeLength = 8;
    let code = "";

    for (let i = 0; i < codeLength; i++) {
        if (i % 2 === 0) {
            // Even indices: Consonants
            code += consonants[Math.floor(Math.random() * consonants.length)];
        } else {
            // Odd indices: Vowels
            code += vowels[Math.floor(Math.random() * vowels.length)];
        }
    }

    return code;
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
