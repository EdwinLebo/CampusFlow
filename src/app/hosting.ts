export const portfolioBuild = import.meta.env.MODE === 'pages'
export const assetUrl = (filename: string) => import.meta.env.BASE_URL + filename
