
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';

import './index.scss';
import App, { initApp } from './app/App';
import { AppAPIProvider } from './api/api';
import { theStore } from './data/store/store';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { ResourceView } from './features/resource-view/ResourceView';
import { Startpage } from './features/startpage/StartPage';


const router = createHashRouter([
    {
        path: '/',
        element: (
            <App />
        ),
        children: [
            {
                path: '',
                element: <Startpage />,
            },
            {
                path: 'resource/:uri',
                element: <ResourceView />,
            },
        ],
    },
]);

initApp();

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    // <React.StrictMode>
    <Provider store={theStore}>
        <AppAPIProvider>
            <RouterProvider router={router} />
        </AppAPIProvider>
    </Provider>
    // </React.StrictMode> 
);
