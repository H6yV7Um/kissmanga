const fs = require( 'fs' );
const hakuneko = require( 'hakuneko' );

var pageFrom = ( process.argv.length > 2 ? process.argv[2] : 1 );
var pageTo = ( process.argv.length > 3 ? process.argv[3] : 9999 );
var pageFrom = parseInt( pageFrom ) || 1;
var pageTo = parseInt( pageTo ) || 9999;

hakuneko.kissmanga.getMangas( function( error, mangaListWeb ) {
    mangas = mangaListWeb.map( ( manga, index ) => {
        return {
            id: manga.u,
            title: manga.t
        }
    });

    if( mangas && mangas.length > 0 ) { 
        fs.writeFile( './cdn/mangas.json', JSON.stringify( mangas ), 'utf-8', ( error ) => {
            if( error ) {
                console.error( error.message );
            }
        } );
    } else {
        console.error( 'Invalid manga list' );
    }
}, pageFrom, pageTo );