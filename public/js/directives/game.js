/*global angular:false*/

angular.module('gameApp').directive('game',
    function ($window, fullscreen, gameController, dataLoader, imageLoader, sharedModel, socket) {

  var canvasWidth = 1000,
    canvasHeight = 600,
    tileSize = 60;

  return {
    templateUrl: '/directives/game',
    restrict: 'E',
    link: function (scope, elm, attrs) {

      /*
       * Get background elements
       */

      var background = elm.find('img')[0];
      var background2 = elm.find('img')[1];

      /*
       * Render Map
       */

      var mapCanvas = elm.find('canvas')[1];
      var mapContext = mapCanvas.getContext('2d');

      mapCanvas.width = 1920;
      mapCanvas.height = 1080;

      /*
       * Setup Map and Tiles
       */

      // TODO: clean up how this is copied
      var levelModel = angular.copy(dataLoader.get('/json/levels/level-one.json'));
      // split strings into arrays
      levelModel.tiles.forEach(function (col, row) {
        levelModel.tiles[row] = col.split('');
      });

      // TODO: clean up how this is copied
      var tileTypes = angular.copy(dataLoader.get('/json/levels/tile-types.json'));
      // split strings into arrays
      tileTypes.types.forEach(function (type) {
        type.shape.forEach(function (row, rowIndex) {
          type.shape[rowIndex] =  row.split('');
        });
      });

      // augment type data for faster init render
      tileTypes.types.forEach(function (type) {
        // TODO: this assumption might break down
        type.firstChar = type.shape[0][0];
      });

      var isType = function (row, col, type) {

        if (levelModel.tiles.length <= row + type.shape.length ||
            levelModel.tiles[0].length <= col + type.shape[0].length) {
          return false;
        }

        var typeRow;
        for (var i = 0; i < type.shape.length; i++) {
          typeRow = type.shape[i];
          for (var j = 0; j < typeRow.length; j++) {
            if (typeRow[j] !==
                levelModel.tiles[row + i][col + j]) {
              return false;
            }
          }
        }
        return true;
      };

      var clearType = function (col, row, type) {
        var typeRow;
        for (var i = 0; i < type.shape.length; i++) {
          typeRow = type.shape[i];
          for (var j = 0; j < typeRow.length; j++) {
            levelModel.tiles[row + i][col + j] = ' ';
          }
        }
      };

      var renderMap = function () {
        levelModel.tiles.forEach(function (col, row) {
          for (var i = 0; i < col.length; i++) {
            var x = tileSize * i,
              y = tileSize * row;

            tileTypes.types.forEach(function (type) {
              if (isType(row, i, type)) {
                clearType(row, i, type);
                mapContext.drawImage(imageLoader.get(type.image),
                  x, y,
                  120, 180);
              }
            });
          }
        });
      };

      renderMap();


      /*
       * Render Models
       */

      var canvas = elm.find('canvas')[0];
      var context = canvas.getContext('2d');
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      var render = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
        // draw some shit

        var model = sharedModel.get();

        var realCenterX = 0;
        var prop, numberOfPlayers = 0;
        for (prop in model.players) {
          if (model.players.hasOwnProperty(prop)) {
            currentPlayer = model.players[prop];
            realCenterX += currentPlayer.x;
            numberOfPlayers += 1;
          }
        }
        realCenterX /= numberOfPlayers;

        projectedUpperLeft = Math.max(realCenterX - canvas.width/2, 0);
        mapCanvas.style.left = '-' + projectedUpperLeft + 'px';

        background.style.left = '-' + Math.floor(projectedUpperLeft/3)%1920 + 'px';
        background2.style.left = '-' + Math.floor(projectedUpperLeft/2)%1920 + 'px';

        var currentPlayer;
        context.fillStyle = "#000";
        for (prop in model.players) {
          if (model.players.hasOwnProperty(prop)) {
            currentPlayer = model.players[prop];
            context.fillRect(
              realCenterX < canvas.width/2 ?
                currentPlayer.x
                : canvas.width/2 - realCenterX + currentPlayer.x,
              currentPlayer.y,
              120, 120);
          }
        }

        // send keystrokes

        var ctrl = gameController.get();
        if (ctrl) {
          socket.getRaw().emit('update:controller', ctrl);
        }

        $window.requestAnimationFrame(render);
      };

      // start rendering the game
      render();


      /*
       * Bind Events
       */

      angular.element(canvas).bind('click', function (ev) {
        // on click ...
      });


      /*
       * Watch for fullscreen
       */

      scope.$watch(function () {
        return fullscreen.get();
      }, function (fullscreenSetting) {
        if (fullscreenSetting) {
           canvas.width = $window.document.width;
           canvas.height = $window.document.height;
        } else {
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
        }
      });


      /*
       * stop rendering when out of scope
       */

      scope.$on('$destroy', function () {
        render = function () {};
      });
    }
  };
});
