"use clinet";

import { Sentence } from "@/utils/miningDao";
import { useMemo } from "react";


export type SentenceListItemProps = {
    sentence: Sentence
}

export function SentenceListItem({sentence}: SentenceListItemProps) {
    const words = useMemo(() => {
        return sentence.content.split(' ');
    }, [sentence.content])

    return (
        <div>
            {sentence.content}
        </div>
    )
}