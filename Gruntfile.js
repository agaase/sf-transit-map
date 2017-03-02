'use strict';
module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        minSuffix: 'min',
        distName: 'sftransit',
        meta: {
            version: '<%= pkg.version %>',
            banner: '/*! sftransit.js - v<%= meta.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '* https://github.com/agaase/\n' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> ' +
                'agaase; Licensed MIT */\n',

        },
        clean: {
            files: ['dist']
        },
        concat: {
            templateDist: {
                options: {
                    banner: '<%= meta.banner %>',
                    stripBanners: true
                },
                files: {
                    'dist/<%= distName %>-lib-<%= meta.version %>.js': ['js/lib/d3.v4.min.js','js/lib/d3.geo.tile.js','js/lib/angular.min.js'],
                    'dist/<%= distName %>-main-<%= meta.version %>.js': ['js/maprender.js','js/main.js']
                }
            }
        },
        uglify: {
            target: {
                options: {
                    banner: '<%= meta.banner %>'
                },
                files: {
                    'dist/<%= distName %>-lib-<%= meta.version %>.<%= minSuffix %>.js': ['dist/<%= distName %>-lib-<%= meta.version %>.js'],
                    'dist/<%= distName %>-main-<%= meta.version %>.<%= minSuffix %>.js': ['dist/<%= distName %>-main-<%= meta.version %>.js']
                }
            }
        },
        jshint: {
            beforeconcat: {
                options: {
                    '-W083': true,
                    eqeqeq: true,
                    immed: true,
                    latedef: true,
                    newcap: true,
                    noarg: true,
                    sub: true,
                    undef: true,
                    boss: true,
                    eqnull: true,
                    globals: {
                        event:true,
                        svgGlobal: true,
                        console: true,
                        alert: true,
                        setTimeout: true,
                        clearTimeout: true,
                        setInterval: true,
                        clearInterval: true,
                        document: true,
                        d3:true,
                        window:true,
                        localStorage:true,
                        angular:true,
                        $:true,
                        MapRender:true
                    }
                },
                src: ['js/main.js']
            }
        }
    });


    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    // Default task.
    grunt.registerTask('default', ['jshint', 'clean', 'concat', 'uglify']);

};