// Express.js connection
const router = require('express').Router();
// User, Post, Vote models
const { User, Post, Comment } = require('../../models');
// Express Session for the session data
const session = require('express-session');
// Authorization Helper
const withAuth = require('../../utilities/auth');
// Sequelize store to save the session so the user can remain logged in
const SequelizeStore = require('connect-session-sequelize')(session.Store);

// Routes

// GET /api/users -- get all users
router.get('/', (req, res) => {
    // Access the User model and run .findAll() method to get all users
    User.findAll({
        // when the data is sent back, exclude the password property
        attributes: { exclude: ['password'] }
    })
      // return the data as JSON formatted
      .then(dbUserData => res.json(dbUserData))
      // if there is a server error, return that error
      .catch(err => {
        console.log(err);
        res.status(500).json(err);
      });
  });

// GET /api/users/1 -- get a single user by id
router.get('/:id', (req, res) => {
    // Acess the User model and run the findOne() method to get a single user based on parameters
    User.findOne({
      // when the data is sent back, exclude the password property
      attributes: { exclude: ['password'] },
      where: {
        // use id as the parameter for the request
        id: req.params.id
      },
      // include the posts the user has created, the posts the user has commented on, and the posts the user has upvoted
      include: [
        {
          model: Post,
          attributes: ['id', 'title', 'post_text', 'created_at']
        },
        {
            model: Comment,
            attributes: ['id', 'comment_text', 'post_id', 'user_id', 'created_at'],
            include: {
                model: Post,
                attributes: ['title']
            }
        }
      ]
    })
      .then(dbUserData => {
        if (!dbUserData) {
          // if no user is found, return an error
          res.status(404).json({ message: 'No user found with this id' });
          return;
        }
        // otherwise, return the data for the requested user
        res.json(dbUserData);
      })
      .catch(err => {
        // if there is a server error, return that error
        console.log(err);
        res.status(500).json(err);
      });
  });

// POST /api/users -- add a new user
router.post('/', (req, res) => {
  // create method
  // expects an object in the form {username: 'Lernantino', email: 'lernantino@gmail.com', password: 'password1234'}
  User.create({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password
  })
    // send the user data back to the client as confirmation and save the session
    .then(dbUserData => {
      req.session.save(() => {
        req.session.user_id = dbUserData.id;
        req.session.username = dbUserData.username;
        req.session.loggedIn = true;
    
        res.json(dbUserData);
      });
    })
    // if there is a server error, return that error
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

// POST /api/users/login -- login route for a user
router.post('/login',  (req, res) => {
    // findOne method by email to look for an existing user in the database with the email address entered
    // expects {email: 'lernantino@gmail.com', password: 'password1234'}
    User.findOne({
        where: {
        email: req.body.email
        }
    }).then(dbUserData => {
        // if the email is not found, return an error
        if (!dbUserData) {
        res.status(400).json({ message: 'No user with that email address!' });
        return;
        }
        // Otherwise, verify the user.
        // call the instance method as defined in the User model
        const validPassword = dbUserData.checkPassword(req.body.password);
        // if the password is invalid (method returns false), return an error
        if (!validPassword) {
            res.status(400).json({ message: 'Incorrect password!' });
            return;
        }
        // otherwise, save the session, and return the user object and a success message
        req.session.save(() => {
          // declare session variables
          req.session.user_id = dbUserData.id;
          req.session.username = dbUserData.username;
          req.session.loggedIn = true;
    
          res.json({ user: dbUserData, message: 'You are now logged in!' });
        });
    });  
});

// POST /api/users/logout -- log out an existing user
router.post('/logout', withAuth, (req, res) => {
  if (req.session.loggedIn) {
    req.session.destroy(() => {
      // 204 status is that a request has succeeded, but client does not need to go to a different page
        // (200 indicates success and that a newly updated page should be loaded, 201 is for a resource being created)
      res.status(204).end();
    });
  } else {
    // if there is no session, then the logout request will send back a no resource found status
    res.status(404).end();
  }
})

// PUT /api/users/1 -- update an existing user
router.put('/:id', withAuth, (req, res) => {
    // update method
    // expects {username: 'Lernantino', email: 'lernantino@gmail.com', password: 'password1234'}
  
    // if req.body has exact key/value pairs to match the model, 
    // you can just use `req.body` instead of calling out each property,
    // allowing for updating only key/value pairs that are passed through
    User.update(req.body, {
        // since there is a hook to hash only the password, the option is noted here
        individualHooks: true,
        // use the id as the parameter for the individual user to be updated
        where: {
            id: req.params.id
        }
    })
      .then(dbUserData => {
        if (!dbUserData[0]) {
          res.status(404).json({ message: 'No user found with this id' });
          return;
        }
        res.json(dbUserData);
      })
      .catch(err => {
        console.log(err);
        res.status(500).json(err);
      });
  })

// DELETE /api/users/1 -- delete an existing user
router.delete('/:id', withAuth, (req, res) => {
    // destroy method
    User.destroy({
      where: {
        id: req.params.id
      }
    })
      .then(dbUserData => {
        if (!dbUserData) {
          res.status(404).json({ message: 'No user found with this id' });
          return;
        }
        res.json(dbUserData);
      })
      .catch(err => {
        console.log(err);
        res.status(500).json(err);
      });
  });

module.exports = router;