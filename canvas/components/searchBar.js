// define('searchBar', ['messageBus', "components/services", 'pagination', 'autocomplete'], function(messageBus, Services, Pagination, Autocomplete){
import messageBus from './messageBus';
import services from './services';
import pagination from './pagination';
import autocomplete from './autocomplete';

export default function searchBar() {

    var _services = new Services();
    var _lastValue = "";

    /**
     *
     * @param options
     * @constructor
     */
    var SearchBar = function(options){

        var _this = this;

        this.pagination = new Pagination("#search-field-pagination");
        this.autocomplete = new Autocomplete("#search-field");
        this.$field = $('#search-field');
        this.$form = $('#form-search');
        this.$reset = this.$form.find('.search-reset');
        this.$buttonSubmit = this.$form.find('.search-submit');

        this.$field.on('keyup change blur focus', function(e){
            var value = _this.$field.val();

            if( value !== '' ){
                _this.enableReset();
            }else{
                _this.disableReset();
            }
        });

        this.$buttonSubmit.on('click', function(){
            _this.$form.submit();
        });

        messageBus.on('searchBar:blur', function(){ _this.$field.blur();});

        this.$form.on('submit', function(e){
            e.preventDefault();

            messageBus.emit("blocItem:setUnselected");

            var value = _this.$field.val();
            let hasVal = value*1 >= 0;
            
            if( _lastValue === value && !hasVal ){
                _this.pagination.next() ;
                return;
            }

            if(options.blurAfterSubmit === true){
                _this.$field.blur();
            }

            _this.submit(e, value);

            if( _this._submitCallback ){
                _this._submitCallback(e, value);
            }

            _lastValue = value;

        });

        this.$reset.on('mousedown', function(){
            _this.reset();
        });

    };

    SearchBar.prototype.enableReset = function(){
        this.$reset.addClass('is-active');
        this.$form.addClass('extended');
    };

    SearchBar.prototype.disableReset = function(){
        this.$reset.removeClass('is-active');
        this.$form.removeClass('extended');
    };

    /**
     *
     * @param e
     */
    SearchBar.prototype.reset = function(e){
        this.$field.val('');
        this.disableReset();
        this.pagination.reset();
        _lastValue = '';
    };

    /**
     *
     * @param e
     * @param value
     */
    SearchBar.prototype.submit = function(e, value){
        var _this = this;

        if( value*1 >= 0){
            Backbone.history.navigate("number/"+value*1,{trigger:false});
            messageBus.emit('map:gotoFaceNumber', {'number': value*1, directly: false});
            _this.pagination.reset();
            this.$field.blur();
        }else if(value.length > 2){
            _services.searchFaces(value, function(data,query){
                _this.pagination.setData(data);
                _this.$field.blur();
            });
        }
    };

    /**
     *
     * @param callback
     */
    SearchBar.prototype.onSubmit = function(callback){
        this._submitCallback = callback;
    };

     return SearchBar;

// });
}