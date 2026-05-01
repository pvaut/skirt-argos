
import { useState } from 'react';
import styles from './StartPage.module.scss';
import { useDebounceInComponent } from '../../util/misc';


interface TpProps {
    updateSearch: (text: string) => void;
 };

export function SearchBar(props: TpProps) {
    const [text, setText] = useState("");

    const update = useDebounceInComponent((newText: string) => {
        props.updateSearch(newText);
    }, 100)

    return (
        <div className={styles.searchBarWrapper}>
            <input
                value={text}
                onChange={(ev) => {
                    setText(ev.target.value);
                    update(ev.target.value);
                }}

                placeholder='Seach for...'
            />
        </div>);
}