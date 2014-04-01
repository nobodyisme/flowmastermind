PieColors = {
    Green: {
        color : "rgba(88, 218, 119, 1.0)",
        labelAlign: 'right',
        labelFontSize: '14',
        labelColor: "#334153"},
    Gray: {
        color : "rgb(238, 238, 238)",
        labelAlign: 'right',
        labelFontSize: '14',
        labelColor: "#b6b6b6"},
    Orange: {
        color : "rgb(253, 180, 92)",
        labelAlign: 'right',
        labelFontSize: '14',
        labelColor: "#422C12"},
    Blue: {
        color : "rgb(207, 228, 255)",
        labelAlign: 'right',
        labelFontSize: '14',
        labelColor: "#422C12"},
    Red: {
        color : "rgb(227, 65, 65)",
        labelAlign: 'right',
        labelFontSize: '14',
        labelColor: "#5a1919"}
};

BarColors = {
    Gray: {
        fillColor : "rgba(235, 235, 235, 1)",
        strokeColor : "rgba(220, 220, 220, 1)",
        labelFontSize: '10',
        labelColor: "#b6b6b6"},
    Blue: {
        fillColor : "rgba(198, 219, 245, 1)",
        strokeColor : "rgba(160, 202, 255, 1)",
        labelFontSize: '10',
        labelColor: 'rgba(65, 44, 19, 1)'},
    Orange: {
        fillColor : "rgba(254, 218, 172, 1)",
        strokeColor : "rgba(253, 180, 92, 1)",
        labelFontSize: '10',
        labelColor: 'rgba(65, 44, 19, 1)'},
    Yellow: {
        fillColor : "rgba(252, 250, 185, 1.0)",
        strokeColor : "rgba(255, 250, 121, 1.0)",
        labelFontSize: '10',
        labelColor: "rgba(102, 99, 37, 1)"},
    Red: {
        fillColor : "rgba(255, 136, 136, 1.0)",
        strokeColor : "rgba(200, 105, 105, 1.0)",
        labelFontSize: '10',
        labelColor: "rgba(102, 54, 54, 1.0)"},
    Green: {
        fillColor : "rgba(162,227,177, 1)",
        strokeColor : "rgba(88, 218, 119, 1)",
        labelFontSize: '10',
        labelColor: '#1D421D'}
};


var status_color = d3.scale.ordinal()
    .domain(['OK', 'BAD', 'FROZEN', 'CLOSED', 'STALLED', 'INIT', null])
    .range([d3.rgb('#67e300'),
            d3.rgb('#ff0d00'),
            d3.rgb('#077a21'),
            d3.rgb('#585a5c'),
            d3.rgb('#ff6400'),
            d3.rgb('#ffd100'),
            d3.rgb('#ffd100')]);

var status_color_light = d3.scale.ordinal()
    .domain(['OK', 'BAD', 'FROZEN', 'CLOSED', 'STALLED', 'INIT', null])
    .range([d3.rgb('#8ef13c'),
            d3.rgb('#ff4940'),
            d3.rgb('#3ba3d0'),
            d3.rgb('#686a6d'),
            d3.rgb('#ff8b40'),
            d3.rgb('#ffdc40')]);
