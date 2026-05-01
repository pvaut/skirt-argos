import { ResourceTilesList } from "./ResourceTilesList";

import styles from './StartPage.module.scss';




export function Startpage() {
    return (
        <div className={styles.body}>
            <ResourceTilesList />
        </div>
    );
}