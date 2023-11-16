import localFont from 'next/font/local'

// Font files can be colocated inside of `pages`
export const anonik = localFont({
    src: [
        {
            path: '../public/fonts/aeonik-pro/AeonikPro-Regular.woff2',
            weight: '400'
        },
        {
            path: '../public/fonts/aeonik-pro/AeonikPro-Medium.woff2',
            weight: '500'
        },
        {
            path: '../public/fonts/aeonik-pro/AeonikPro-Bold.woff2',
            weight: '600'
        },
        {
            path: '../public/fonts/aeonik-pro/AeonikPro-Black.woff2',
            weight: '700'
        },
    ],
    variable: '--font-anonik'
})