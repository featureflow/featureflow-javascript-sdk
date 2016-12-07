/**
 * Created by oliver on 23/11/16.
 */
function FeatureflowContext(context){
    var featureflowContext = context;

    featureflowContext.update = function(context){
        context = clone(context);
    };

    featureflowContext.getContext = function(){
        return clone(context);
    };

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    return featureflowContext;
}

module.exports = FeatureflowContext;

