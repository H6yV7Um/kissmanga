const fs = require( 'fs' );
const url = require( 'url' );
const path = require( 'path' );
const hakuneko = require( 'hakuneko' );

var pageFrom = ( process.argv.length > 2 ? process.argv[2] : 1 );
var pageTo = ( process.argv.length > 3 ? process.argv[3] : 9999 );
var pageFrom = parseInt( pageFrom ) || 1;
var pageTo = parseInt( pageTo ) || 9999;

/**
 * Helper function to recursively create all non-existing folders of the given path.
 */
function createDirectoryChain( dir ) {
    if( fs.existsSync( dir ) || dir === path.parse( dir ).root ) {
        return;
    }
    createDirectoryChain( path.dirname( dir ) );
    fs.mkdirSync( dir, '0755', true );
}

/**
 * 
 * @param {*} file 
 * @param {*} content 
 * @param {*} callback 
 */
function saveFileJSON( file, content, callback ) {
    createDirectoryChain( path.dirname( file ) );
    fs.writeFile( file, content, 'utf-8', ( error ) => {
        if( error ) {
            console.error( error.message );
        }
        if( callback ) {
            callback( error );
        }
    } );
}

/**
 * 
 * @param {*} uri 
 */
function mangaIdenifier( uri ) {
    return url.parse( uri ).pathname.split( '/' )[2];
}

/**
 * 
 * @param {*} uri 
 */
function chapterIdentifier( uri ) {
    let parts = url.parse( uri, true );
    let name = parts.pathname.split( '/' )[3];
    let id = parts.query['id'];
    return ( id ? id : name );
}

/**
 * 
 * @param {*} uri 
 */
function chapterExist( file ) {
    try {
        return ( JSON.parse( fs.readFileSync( file, 'utf8' ) ).length > 0 );
    } catch( e ) {
        return false;
    }
}

/**
 * 
 * @param {*} chapterListWeb 
 */
function syncChapters( chapterListWeb, callback, chapterIndex ) {
    chapterIndex = chapterIndex || 0;
    if( chapterIndex >= chapterListWeb.length ) {
        if( callback ) {
            callback( null );
        }
        return;
    }
    let chapterWeb = chapterListWeb[chapterIndex];
    let pagesFile = `./cdn/${ mangaIdenifier( chapterWeb.u ) }/${ chapterIdentifier( chapterWeb.u ) }.json`;
    // check if this chapter already exist and has pages
    if( chapterExist( pagesFile ) ) {
        // process next chapter
        setTimeout( syncChapters.bind( null, chapterListWeb, callback, chapterIndex + 1 ), 0 );
        return;
    }
    // get pages from web
    hakuneko.kissmanga.getPages( chapterWeb, function( error, pageListWeb ) {
        if( !error && pageListWeb && pageListWeb.length > 0 ) {
            console.log( '    PAGES:', pageListWeb.length );
            // save page list to repository
            saveFileJSON( pagesFile, JSON.stringify( pageListWeb, null, 2 ) );
        }
        // process next chapter
        setTimeout( syncChapters.bind( null, chapterListWeb, callback, chapterIndex + 1 ), 5000 );
    } );
}

/**
 * 
 * @param {*} mangaListWeb 
 * @param {*} mangaLimit 
 * @param {*} mangaIndex 
 */
function syncMangas( mangaListWeb, mangaLimit, mangaIndex ) {
    mangaIndex = mangaIndex || 0;
    mangaLimit = mangaLimit || mangaListWeb.length;
    if( mangaIndex >= mangaLimit ) {
        return;
    }
    let mangaWeb = mangaListWeb[mangaIndex];
    console.log( 'MANGA:', mangaWeb.t );
    // get all chapters for this manga
    hakuneko.kissmanga.getChapters( mangaWeb, function( error, chapterListWeb ) {
        if( !error && chapterListWeb && chapterListWeb.length > 0 ) {
            console.log( '  CHAPTERS:', chapterListWeb.length );
            // convert chapters into stored structure
            let chapters = chapterListWeb.map( ( chapter ) => {
                return {
                    id: chapterIdentifier( chapter.u ),
                    title: chapter.t,
                    language: chapter.l,
                    scanlator: chapter.g,
                    volume: chapter.v,
                    number: chapter.n
                };
            } );
            // save chapter list to repository
            saveFileJSON( `./cdn/${ mangaIdenifier( mangaWeb.u ) }/chapters.json`, JSON.stringify( chapters, null, 2 ) );
            // process all chapters for this manga
            syncChapters( chapterListWeb, ( error ) => {
                // process next manga
                setTimeout( syncMangas.bind( null, mangaListWeb, mangaLimit, mangaIndex + 1 ), 0 );
            } );
        }
    } );
}

/************
 *** MAIN ***
 ************/

hakuneko.kissmanga.getMangas( function( error, mangaListWeb ) {
    if( !error && mangaListWeb && mangaListWeb.length > 0 ) {
        // convert mangas into stored structure
        let mangas = mangaListWeb.map( ( manga ) => {
            return {
                id: mangaIdenifier( manga.u ),
                title: manga.t
            };
        } );
        // save manga list to repository
        saveFileJSON( `./cdn/mangas.json`, JSON.stringify( mangas, null, 2 ) );
        // process all mangas for this connector
//        syncMangas( mangaListWeb, /* 500 */ );
    } else {
        console.error( 'Invalid manga list' );
    }
}, pageFrom, pageTo );