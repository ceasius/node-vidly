const express = require('express');
const { Rental, validate } = require('../models/rental');
const { Movie } = require('../models/movie');
const { Customer } = require('../models/customer');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const rentals = await Rental.find().sort('-dateOut');
        res.send(rentals);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { error } = validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        const customer = await Customer.findById(req.body.customerId);
        if (!customer) return res.status(400).send('Invalid customer.');

        const movie = await Movie.findById(req.body.movieId);
        if (!movie) return res.status(400).send('Invalid movie.');

        if (movie.numberInStock === 0)
            return res.status(400).send('Movie not in stock.');

        let rental = new Rental({
            customer: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone
            },
            movie: {
                _id: movie._id,
                title: movie.title,
                dailyRentalRate: movie.dailyRentalRate
            }
        });
        rental = await rental.save();

        movie.numberInStock--;
        await movie.save();

        await session.commitTransaction();
        session.endSession();

        res.send(rental);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).send(err.message);
    }
});

module.exports = router;
