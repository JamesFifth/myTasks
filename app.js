require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require('express-session');
const passport = require('passport');
const _ = require("lodash");
const mongoose = require("mongoose");
const passportLocalMongoose = require('passport-local-mongoose');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const multer = require('multer');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("./public"));

// add Favicon
//import packages, using favicon
var favicon = require('serve-favicon'), path = require("path");
app.use(favicon(path.join(__dirname+'/favicon.ico')));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize());

app.use(passport.session());

// <username>:<password> is the username and password to link my mongodb altas dbs
mongoose.connect("mongodb+srv://<username>:<password>@cluster0.wtqey.mongodb.net/myTasksDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);

// -------User Model-------- //

const userSchema = new mongoose.Schema({
  account: String,
  email: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: "/auth/google/welcomepage"
// },
//   function (accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

// app.get('/auth/google',
//   passport.authenticate('google', { scope: ['profile'] })
// );

// app.get('/auth/google/welcomepage',
//   passport.authenticate('google', { failureRedirect: '/' }),
//   function (req, res) {
//     res.redirect('/welcomepage');
//   }
// );

// -------Task Model-------- //

const taskSchema = {
  name: String,
  userID: String,
  deadline: [],
  listname: String
};

const Task = mongoose.model("Task", taskSchema);

// -------TaskList Model-------- //

const taskListSchema = {
  name: String,
  userID: String,
  tasks: [taskSchema]
};

const TaskList = mongoose.model("TaskList", taskListSchema);

// ------- Routes -------- //

// GET routes

// home
app.get("/", function (req, res) {
  res.render("index")
})

// sign up
app.get("/signup", function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/welcomepage");
  } else {
    res.render("signup")
  }
})

// sign out
app.get("/signout", function (req, res) {
  req.logout();
  res.redirect("/");
})

// past today task
app.get("/taskspast", function (req, res) {
  if (req.isAuthenticated()) {
    // today time
    const todayYear = new Date().getFullYear(), todayMonth = new Date().getMonth() + 1, todayDay = new Date().getDate(),todayHour = new Date().getHours(),todayMinutes = new Date().getMinutes();
    const todayYearString = todayYear.toString();
    const todayMonthString = todayMonth < 10 ? "0" + todayMonth.toString() : todayMonth.toString();
    const todayDayString = todayDay < 10 ? "0" + todayDay.toString() : todayDay.toString();
    const todayHourString = todayHour < 10 ? "0" + todayHour.toString() : todayHour.toString();
    const todayMinutesString = todayMinutes < 10 ? "0" + todayMinutes.toString() : todayMinutes.toString();
    const todayString = todayYearString + todayMonthString + todayDayString + todayHourString + todayMinutesString;
    const todayDate = parseInt(todayString);
    // filter using Task model
    Task.find({ userID: req.user.id }, function (err, foundTasks) {
      // filter using TaskList model
      const fTasks = [];
      foundTasks.forEach(tsk => {
        const deadli = tsk.deadline;
        const yea = deadli[0], mon = deadli[1], da = deadli[2], hou = deadli[3], min = deadli[4];
        const yearString = yea.toString();
        const monthString = mon < 10 ? "0" + mon.toString() : mon.toString();
        const dayString = da < 10 ? "0" + da.toString() : da.toString();
        const hourString = hou < 10 ? "0" + hou.toString() : hou.toString();
        const minutesString = min < 10 ? "0" + min.toString() : min.toString();
        const dlString = yearString + monthString + dayString + hourString + minutesString;
        const dlDate = parseInt(dlString);
        
        if(todayDate > dlDate) {
          fTasks.push(tsk);
        }
      })
      TaskList.find({ userID: req.user.id }, function (err, foundLists) {
        foundLists.forEach(list => {
          if (list.tasks.length != 0) {
            const currentTasks = list.tasks;
            currentTasks.forEach(singleTask => {
              const deadline = singleTask.deadline;
              const year = deadline[0], month = deadline[1], day = deadline[2], hour = deadline[3], minutes = deadline[4];
              const lyearString = year.toString();
              const lmonthString = month < 10 ? "0" + month.toString() : month.toString();
              const ldayString = day < 10 ? "0" + day.toString() : day.toString();
              const lhourString = hour < 10 ? "0" + hour.toString() : hour.toString();
              const lminutesString = minutes < 10 ? "0" + minutes.toString() : minutes.toString();
              const ldlString = parseInt(lyearString + lmonthString + ldayString + lhourString + lminutesString);
              if(ldlString < todayDate){
                fTasks.push(singleTask);
              }
            });
          };
        });
        // sort task according to its deadline
        fTasks.sort(function (a, b) {
          if (a.deadline[0] < b.deadline[0]) return -1;
          if (a.deadline[0] > b.deadline[0]) return 1;
          if (a.deadline[1] < b.deadline[1]) return -1;
          if (a.deadline[1] > b.deadline[1]) return 1;
          if (a.deadline[2] < b.deadline[2]) return -1;
          if (a.deadline[2] > b.deadline[2]) return 1;
          if (a.deadline[3] < b.deadline[3]) return -1;
          if (a.deadline[3] > b.deadline[3]) return 1;
          if (a.deadline[4] < b.deadline[4]) return -1;
          if (a.deadline[4] > b.deadline[4]) return 1;
          return 0;
        });
        // then show it on today list
        res.render("listpast", { listTitle: "Past", newListTasks: fTasks });
      });
    });
  } else {
    res.redirect("/")
  };
});

// all today task
app.get("/tasks", function (req, res) {
  if (req.isAuthenticated()) {

    Task.find({ userID: req.user.id }, function (err, foundTasks) {
      var fTasks = foundTasks;
      // start
      fTasks = foundTasks.filter(function (e) {
        const todayyear = new Date().getFullYear(), todaymonth = new Date().getMonth() + 1, todayday = new Date().getDate();
        return e.deadline[0] == todayyear & e.deadline[1] == todaymonth & e.deadline[2] == todayday;
      });
      // end
      TaskList.find({ userID: req.user.id }, function (err, foundLists) {
        foundLists.forEach(list => {
          if (list.tasks.length != 0) {
            var currentTasks = list.tasks;
            currentTasks.forEach(singleTask => {
              const deadline = singleTask.deadline;
              const year = deadline[0], month = deadline[1], day = deadline[2], todayYear = new Date().getFullYear(), todayMonth = new Date().getMonth() + 1, todayDay = new Date().getDate();
              if (year === todayYear & month === todayMonth & day === todayDay) {
                fTasks.push(singleTask);
              };
            });
          };
        });
        // sort task according to its deadline
        fTasks.sort(function (a, b) {
          if (a.deadline[0] < b.deadline[0]) return -1;
          if (a.deadline[0] > b.deadline[0]) return 1;
          if (a.deadline[1] < b.deadline[1]) return -1;
          if (a.deadline[1] > b.deadline[1]) return 1;
          if (a.deadline[2] < b.deadline[2]) return -1;
          if (a.deadline[2] > b.deadline[2]) return 1;
          if (a.deadline[3] < b.deadline[3]) return -1;
          if (a.deadline[3] > b.deadline[3]) return 1;
          if (a.deadline[4] < b.deadline[4]) return -1;
          if (a.deadline[4] > b.deadline[4]) return 1;
          return 0;
        });
        // then show it on today list
        // Task.save();
        res.render("list", { listTitle: "Today", newListTasks: fTasks });
      });
    });
  } else {
    res.redirect("/")
  };
});

// past today task
app.get("/tasksfuture", function (req, res) {
  if (req.isAuthenticated()) {
    const todayYear = new Date().getFullYear(), todayMonth = new Date().getMonth() + 1, todayDay = new Date().getDate(), todayHour = new Date().getHours(), todayMinutes = new Date().getMinutes();
    const todayYearString = todayYear.toString();
    const todayMonthString = todayMonth < 10 ? "0" + todayMonth.toString() : todayMonth.toString();
    const todayDayString = todayDay < 10 ? "0" + todayDay.toString() : todayDay.toString();
    const todayHourString = todayHour < 10 ? "0" + todayHour.toString() : todayHour.toString();
    const todayMinutesString = todayMinutes < 10 ? "0" + todayMinutes.toString() : todayMinutes.toString();
    const todayDate = parseInt(todayYearString + todayMonthString + todayDayString + todayHourString + todayMinutesString);
    // filter using Task model
    Task.find({ userID: req.user.id }, function (err, foundTasks) {
      // filter using TaskList model
      var fTasks = [];
      foundTasks.forEach(tsk => {
        const deadli = tsk.deadline;
        const yea = deadli[0], mon = deadli[1], da = deadli[2], hou = deadli[3], min = deadli[4];
        const yearString = yea.toString();
        const monthString = mon < 10 ? "0" + mon.toString() : mon.toString();
        const dayString = da < 10 ? "0" + da.toString() : da.toString();
        const hourString = hou < 10 ? "0" + hou.toString() : hou.toString();
        const minutesString = min < 10 ? "0" + min.toString() : min.toString();
        const dlDate = parseInt(yearString + monthString + dayString + hourString + minutesString);
        if(todayDate < dlDate) fTasks.push(tsk);
      })
      TaskList.find({ userID: req.user.id }, function (err, foundLists) {
        foundLists.forEach(list => {
          if (list.tasks.length != 0) {
            const currentTasks = list.tasks;
            currentTasks.forEach(singleTask => {
              const deadline = singleTask.deadline;
              const year = deadline[0], month = deadline[1], day = deadline[2], hour = deadline[3], minutes = deadline[4];
              const lyearString = year.toString();
              const lmonthString = month < 10 ? "0" + month.toString() : month.toString();
              const ldayString = day < 10 ? "0" + day.toString() : day.toString();
              const lhourString = hour < 10 ? "0" + hour.toString() : hour.toString();
              const lminutesString = minutes < 10 ? "0" + minutes.toString() : minutes.toString();
              const ldlString = parseInt(lyearString + lmonthString + ldayString + lhourString + lminutesString);
              if(ldlString > todayDate){
                fTasks.push(singleTask);
              }
            });
          };
        });
        // sort task according to its deadline
        fTasks.sort(function (a, b) {
          if (a.deadline[0] < b.deadline[0]) return -1;
          if (a.deadline[0] > b.deadline[0]) return 1;
          if (a.deadline[1] < b.deadline[1]) return -1;
          if (a.deadline[1] > b.deadline[1]) return 1;
          if (a.deadline[2] < b.deadline[2]) return -1;
          if (a.deadline[2] > b.deadline[2]) return 1;
          if (a.deadline[3] < b.deadline[3]) return -1;
          if (a.deadline[3] > b.deadline[3]) return 1;
          if (a.deadline[4] < b.deadline[4]) return -1;
          if (a.deadline[4] > b.deadline[4]) return 1;
          return 0;
        });
        // then show it on today list
        res.render("listfuture", { listTitle: "Future", newListTasks: fTasks });
      });
    });
  } else {
    res.redirect("/")
  };
});

// all other tasks
app.get("/allTasks", function (req, res) {
  if (!req.isAuthenticated()) {
    res.redirect("/");
  }
  const userID = req.user.id;
  TaskList.find({ "userID": userID }, function (err, foundList) {
    if (!err) {
      res.render("allTasks", { allTasks: foundList });
    } else {
      console.log(err);
      res.redirect("/");
    }
  })
})

// create a new task
app.get("/newTask", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("newTask");
  } else {
    res.render("index");
  }
})

// welcomepage
app.get("/welcomepage", function(req, res){
  res.render("welcomepage");
})

// POST routes

// handle sign up form
app.post("/signup", function (req, res) {

  const account = req.body.account;
  const email = req.body.username;
  const password = req.body.password;

  User.register({ account: account, username: email, active: false }, password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/welcomepage");
      })
    };
  });
});

// handle sign in form
app.post("/signin", function (req, res) {

  if (req.isAuthenticated()) {
    res.redirect("/welcomepage");
  }

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local", { failureRedirect: '/signin' })(req, res, function () {
        res.redirect("/welcomepage");
      })
    }
  })
})

// handle add task to today list
app.post("/tasks", function (req, res) {
  const taskName = req.body.newTask;
  const listName = req.body.list;
  const userID = req.user.id;
  const deadline_date = req.body.deadline_date;
  const deadline_time = req.body.deadline_time;
  var date = deadline_date.split("-");
  var time = deadline_time.split(":");
  var year = parseInt(date[0]);
  var month = parseInt(date[1]);
  var day = parseInt(date[2]);
  var hour = parseInt(time[0]);
  var minute = parseInt(time[1]);
  var deadline = [year, month, day, hour, minute];
  const task = new Task({
    name: taskName,
    userID: userID,
    deadline: deadline,
    listname: listName
  });
  if (listName === "Today") {
    task.save();
    res.redirect("/tasks");
  }
  else {
    TaskList.findOne({ name: listName, userID: userID }, function (err, foundList) {
      foundList.tasks.push(task);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

// delete single task from list
app.post("/delete", function (req, res) {
  const checkedTaskId = req.body.checkbox;
  const listName = req.body.listName;
  // console.log(listName);
  const belongToListName = req.body.belongToListName;
  // console.log(belongToListName);
  const userID = req.user.id;
  if (listName === "Today") {
    Task.findByIdAndRemove(checkedTaskId, function (err) {
      if (!err) {
        TaskList.findOneAndUpdate({ name: belongToListName, userID: userID }, { $pull: { tasks: { _id: checkedTaskId } } }, function (err, foundList) {
          if (!err) {
            res.redirect("/tasks");
          }
        });
      }
    });
  } else {
    // console.log("here")
    TaskList.findOneAndUpdate({ name: belongToListName, userID: userID }, { $pull: { tasks: { _id: checkedTaskId } } }, function (err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }
});

app.post("/deletepast", function (req, res) {
  const checkedTaskId = req.body.checkbox;
  const listName = req.body.listName;
  // console.log(listName);
  const belongToListName = req.body.belongToListName;
  // console.log(belongToListName);
  const userID = req.user.id;
  if (belongToListName === "Today") {
    Task.findByIdAndRemove(checkedTaskId, function (err) {
      if (!err) {
        res.redirect("/taskspast");
      }
    });
  } else {
    TaskList.findOneAndUpdate({ name: belongToListName, userID: userID }, { $pull: { tasks: { _id: checkedTaskId } } }, function (err, foundList) {
      if (!err) {
        if(listName == "taskspast"){
          res.redirect("/taskspast");
        } else {
          res.redirect("/tasksfuture");
        }
        
      }
    });
  }
});

// delete a whole list from db
app.post("/deleteList", function (req, res) {
  if (!req.isAuthenticated()) {
    res.redirect("/");
  }
  // console.log(req.body.listID);
  TaskList.findOneAndDelete({ _id: req.body.listID }, function (err) {
    if (err) {
      console.log(err)
    }
    else {
      res.redirect("/allTasks")
    }
  });
})

// add an empty new list
app.post("/newTask", function (req, res) {
  res.redirect("/" + req.body.listname);
})

// Dynamic routes

// create a new list with name = customListName

app.get("/:customListName", function (req, res) {

  if (!req.isAuthenticated()) {
    res.redirect("/");
  }

  const customListName = _.capitalize(req.params.customListName);

  const userID = req.user.id;

  TaskList.findOne({ name: customListName, userID: userID }, function (err, foundList) {
    if (!err) {
      if (!foundList) {
        const list = new TaskList({
          name: customListName,
          userID: userID,
          tasks: []
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        res.render("list", { listTitle: foundList.name, newListTasks: foundList.tasks });
      }
    }
  });
});

// Server
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function () {
  console.log("Server has started successfully");
});