// CloudFront Function (cloudfront-js-2.0), viewer-request, attached to every behavior.
// The apex/site domain placeholders below are substituted by lib/website-stack.ts at synth time.
function toQueryString(querystring) {
    return Object.keys(querystring).map(function (k) {
        var q = querystring[k];
        return q.multiValue
            ? q.multiValue.map(function (v) { return k + '=' + v.value; }).join('&')
            : (q.value === '' ? k : k + '=' + q.value);
    }).join('&');
}

function redirect(location) {
    return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: { location: { value: location } }
    };
}

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var query = toQueryString(request.querystring);
    var suffix = query ? '?' + query : '';

    // apex -> www
    if (request.headers.host.value === '__APEX_DOMAIN__') {
        return redirect('https://__SITE_DOMAIN__' + uri + suffix);
    }

    // Exactly /arsenal-iq -> /arsenal-iq/ (/arsenal-iqfoo is NOT matched and stays with the React app)
    if (uri === '/arsenal-iq') {
        return redirect('/arsenal-iq/' + suffix);
    }

    // SPA deep links: extensionless last segment -> that SPA's index.html.
    // Anything with a file extension is a real file and passes through untouched,
    // so a missing asset returns a native 404 from S3.
    var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
    if (lastSegment.indexOf('.') === -1) {
        request.uri = uri.indexOf('/arsenal-iq/') === 0 ? '/arsenal-iq/index.html' : '/index.html';
    }
    return request;
}
