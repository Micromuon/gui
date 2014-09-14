$(function() {

    $.ajaxSetup({
      cache: false
    });

    // Handlebars helper for variable equals test
    Handlebars.registerHelper('ifCond', function(v1, v2, options) {
        if(v1 === v2) {
            return options.fn(this);
        }
        return options.inverse(this);
    });

    /* Deploy */

    $("#newService").submit(function () {
        if ($("#gitUrl").val() == "") {
            console.log("URL input empty!");
        } else {
            $("#newModal button").add("#newModal input").prop("disabled", true);
            $("#deploySubmit").text("Deploying...");
            $.ajax({
                type: "PUT",
                url: "http://localhost:" + wrapperPort + "/deployer/deploy",
                data: {url: $("#gitUrl").val()}
            })
                .done(function (msg) {
                    console.log(msg);
                    var template = '<tr data-id="{{this.name}}">\
                        <td>{{this.name}}</td>\
                        <td>{{this.url}}</td>\
                        <td>\
                            <button class="btn btn-success toggleHealthcheckModal">\
                            Healthcheck Options\
                            </button>\
                        </td>\
                        <td>\
                            <button class="btn btn-success toggleAlertModal">\
                            Alert Options\
                            </button>\
                        </td>\
                        <td>{{this.port}}</td>\
                        <td class="runningStatus">\
                            <button class="btn btn-{{#ifCond this.status "running"}}danger{{else}}success{{/ifCond}} serviceStartStop">\
                                <span class="glyphicon glyphicon-{{#ifCond this.status "running"}}stop{{else}}play{{/ifCond}}"></span>\
                            </button>\
                        </td>\
                        <td>\
                            <button class="btn btn-danger toggleDeleteModal">\
                                <span class="glyphicon glyphicon-remove"></span>\
                            </button>\
                        </td>\
                        <td>\
                            <button class="btn btn-success goToLogs">\
                                Logs\
                            </button>\
                        </td>\
                    </tr>';
                    var templateHb = Handlebars.compile(template);
                    $("#serviceRows").append(templateHb(msg));
                    $("#newModal").modal("hide");
                    $("#gitUrl").val("");
                })
                .error(function (error) {
                    console.log(error);
                })
                .always(function (data) {
                    $("#newModal button").add("#newModal input").prop("disabled", false);
                    $("#deploySubmit").text("Deploy");
                });
        }
        return false;
    });

    /* Start/stop */

    $("#serviceRows").on("click", ".serviceStartStop", function() {
        var clickedButton = $(this);
        var action = clickedButton.hasClass("btn-danger") ? "stop" : "start";
        $.ajax({
            type: "PUT",
            url: "http://localhost:" + wrapperPort + "/deployer/" + action + "/" + clickedButton.parents("tr").data("id")
        })
            .done(function(data) {
                console.log(data);
                var stopped = action == "stop";
                clickedButton.removeClass().addClass("serviceStartStop btn btn-" + (stopped ? "success" : "danger"));
                clickedButton.find("span").removeClass().addClass("glyphicon glyphicon-" + (stopped ? "play" : "stop"));
                clickedButton.parents("td").prev().text(stopped ? "" : data.port);
            })
            .error(function(error) {
                console.log(error);
            });
    });

    /* Delete */

    $("#serviceRows").on("click", ".toggleDeleteModal", function() {
        if ($(this).parents("tr").find(".runningStatus").find("span").hasClass("glyphicon-stop")) {
            $("#noDeleteModal").modal("show");
        } else {
            $("#deleteId").val($(this).parents("tr").data("id"));
            $("#deleteModal").modal("show");
        }
    });

    $("#deleteService").submit(function () {
        if ($("#deleteId").val() == "") {
            console.log("Service name empty!");
        } else {
            $("#deleteModal button").prop("disabled", true);
            $("#deleteSubmit").text("Deleting...");
            $.ajax({
                type: "DELETE",
                url: "http://localhost:" + wrapperPort + "/deployer/delete/" + $("#deleteId").val()
            })
                .done(function (msg) {
                    console.log(msg);
                    $("tr[data-id='" + msg.name + "']").remove();
                    $("#deleteModal").modal("hide");
                    $("#deleteId").val("");
                })
                .error(function (error) {
                    console.log(error);
                })
                .always(function (data) {
                    $("#deleteModal button").prop("disabled", false);
                    $("#deleteSubmit").text("Delete");
                });
        }
        return false;
    });
    
    //Healthcheck modal listener
    
    $("#serviceRows").on("click", ".toggleHealthcheckModal", function() {
        var clickedButton = $(this);
        if ($(this).parents("tr").find(".runningStatus").find("span").hasClass("glyphicon-stop")) {
            $.ajax({
            type: "GET",
            url: "http://localhost:" + wrapperPort + "/healthcheck/query/" + clickedButton.parents("tr").data("id")
        })
            .done(function(data) {
                console.log(data);
                if (data.healthcheckSettings.length > 0) {
                    $("#localURL").val(data.healthcheckSettings[0].localURL);
                    $("#frequency").val(data.healthcheckSettings[0].frequency);
                    $("#expectedResStatus").val(data.healthcheckSettings[0].expectedResStatus);
                    $("#expectedResBody").val(data.healthcheckSettings[0].expectedResBody);
                    $("#healthExists").val("yes");
                } else {
                    $("#localURL").val("");
                    $("#frequency").val("");
                    $("#expectedResStatus").val("");
                    $("#expectedResBody").val("");
                    $("#healthExists").val("");
                }
            })
            .error(function(error) {
                console.log(error);
            });
            $("#healthId").val($(this).parents("tr").data("id"));
            $("#healthcheckModal").modal("show");
        } else {
            $("#noHealthcheckModal").modal("show");
        }
    });
    
    $("#healthUpdate").submit(function () {
        $("#healthcheckModal button").add("#healthcheckModal input").prop("disabled", true);
        $("#healthSubmit").text("Updating...");
        var url = "http://localhost:" + wrapperPort + "/healthcheck/submit";
        if ($("#healthExists").val() == "yes") {
            url = "http://localhost:" + wrapperPort + "/healthcheck/update/" + $("#healthId").val();
        }
        $.ajax({
            type: "PUT",
            url: url,
            data: {"name": $("#healthId").val(), 
                   "localURL": $("#localURL").val(), 
                   "frequency": $("#frequency").val(), 
                   "expectedResBody": $("#expectedResBody").val(),
                   "expectedResStatus": $("#expectedResStatus").val()
                  }
        })
            .done(function (msg) {
                console.log(msg);
                $("#healthcheckModal").modal("hide");
            })
            .error(function (error) {
                console.log(error);
            })
            .always(function (data) {
                $("#healthcheckModal button").add("#healthcheckModal input").prop("disabled", false);
                $("#healthSubmit").text("Submit");
            });
        return false;
    });
    
    // Alert modal
     
    $("#serviceRows").on("click", ".toggleAlertModal", function() {
        var clickedButton = $(this);
        $.ajax({
            type: "GET",
            url: "http://localhost:" + wrapperPort + "/alerting/query/" + clickedButton.parents("tr").data("id")
        })
        .done(function(data) {
            console.log(data);
            if (data.alertSettings.length > 0) {
                $("#emails").val(data.alertSettings[0].emails.join(","));
                $("#alertFrequency").val(data.alertSettings[0].frequency);
                $("#alertingExists").val("yes");
            } else {
                $("#emails").val("");
                $("#alertFrequency").val("");
                $("#alertingExists").val("");
            }
        })
        .error(function(error) {
            console.log(error);
        });
        $("#alertId").val($(this).parents("tr").data("id"));
        $("#alertingModal").modal("show");
    });
    
    $("#alertingUpdate").submit(function () {
        $("#alertingModal button").add("#alertingModal input").prop("disabled", true);
        $("#alertingSubmit").text("Updating...");
        var url = "http://localhost:" + wrapperPort + "/alerting/save";
        if ($("#alertingExists").val() == "yes") {
            url = "http://localhost:" + wrapperPort + "/alerting/update/" + $("#alertId").val();
        }
        $.ajax({
                type: "PUT",
                url: url,
                data: {"name": $("#alertId").val(), 
                    "emails": $("#emails").val().split(","),
                    "frequency": $("#alertFrequency").val()
                }
            })
            .done(function (msg) {
                console.log(msg);
                $("#alertingModal").modal("hide");
            })
            .error(function (error) {
                console.log(error);
            })
            .always(function (data) {
                $("#alertingModal button").add("#alertingModal input").prop("disabled", false);
                $("#alertingSubmit").text("Submit");
            });
        return false;
    });
    
    $("#serviceRows").on("click", ".goToLogs", function() {
        var clickedButton = $(this);
        window.location = "http://localhost:8080/logs/"+clickedButton.parents("tr").data("id");
        console.log("HI IVE BEEN CLICKED");
    });
    
});

