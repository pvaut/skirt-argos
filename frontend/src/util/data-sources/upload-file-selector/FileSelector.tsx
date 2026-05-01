

import React, { useRef, useState } from 'react';
import { useConfig } from '../../../data/helpers';
import { useLocalResourcesStorage } from '../../../data/usage/useLocalResourcesStorage';

import styles from "./FileSelector.module.scss";
import { allSourceFileExtensions } from '../file-parsers/sourceFileParser';
import { fileImportWizard } from './fileImportWizard';



const FileSelector: React.FC = () => {
    const refInputField = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const config = useConfig();
    const localResourcesStorage = useLocalResourcesStorage();

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
    };

    const handleClick = () => {
        refInputField.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file);
    };

    async function loadFile(file: File) {
        console.log(`File selected: ${file.name} size: ${file.size}`);
        fileImportWizard(config, localResourcesStorage, file,
            () => { setTimeout(() => { refInputField.current!.value = ''; }, 250); }
        );
    }

    return (
        <div
            className={isDragging ? styles.selectorContainerDragging : styles.selectorContainer}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { setIsDragging(false); }}
            onClick={handleClick}
        >
            Drag & drop a new file here,<br />or <span className="upload-link">click to select.</span>
            <input
                style={{ display: 'none' }}
                type="file"
                accept={allSourceFileExtensions.map(ext => `.${ext}`).join(',')}
                ref={refInputField}
                onChange={handleFileChange}
            />
        </div>
    );
};


export default FileSelector;