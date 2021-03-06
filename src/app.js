// Vendor Modules
import $ from 'jquery';
import _ from 'underscore';

// CSS
import './css/foundation.css';
import './css/style.css';
import Trip from './app/models/trip';
import TripList from './app/collections/trip_list';
import Reservation from './app/models/reservation';

// Initialize
const tripList = new TripList();
let filteredTrips;
const tripListTemplate = _.template($('#trip-list-template').html());
const tripTemplate = _.template($('#trip-template').html());

const render = function render(list) {
  const $list = $('#trip-list');
  $list.empty();
  list.forEach((trip) => {
    $list.append(tripListTemplate(trip.toJSON()));
  });
}

const fields = ['name', 'continent', 'category', 'weeks', 'cost', 'about'];
const reservationFields = ['name', 'email', 'age'];

const events = {
  showTrips() {
    console.log('SHOW ME TRIPS!');
    $('button#show-trips').hide();
    $('#filter').show();
    $('#trip-table').show();
  },
  showTrip(event) {
    console.log('A TRIP!');
    $('.selected-trip').removeClass('selected-trip');
    $(event.target.parentElement).addClass('selected-trip');
    $('#reservation').show();
    const trip = new Trip({id: event.target.parentElement.id});
    trip.fetch({}).done(() => {
      console.log('YAY');
      $('#show-trip').html(tripTemplate(trip.attributes));
      $('form').attr('action', `${trip.url()}/reservations`);
    }).fail(() => {
      console.log('OOPS');
      $('#show-trip').html('<p>Looks like that trip left without you...</p>');
    });
  },
  addTrip(event) {
    event.preventDefault();
    const tripData = {};
    fields.forEach((field) => {
      $(`#add-trip-form label[for=${field}] span`).remove();
      $(`#add-trip-form input[name=${field}]`).removeClass('error');
      tripData[field] = $(`#add-trip-form [name=${field}]`).val();
    });
    const trip = new Trip(tripData);
    if (trip.isValid()) {
      trip.save({}, {
        success: events.successfulSave,
        error: events.failedSave,
      });
    } else {
      Object.entries(trip.validationError).forEach((error) => {
        $(`#add-trip-form label[for=${error[0]}] span`).remove();
        $(`#add-trip-form label[for=${error[0]}]`).append(`<span class="error">: ${error[1]}</span>`);
        $(`#add-trip-form input[name=${error[0]}]`).addClass('error');
      });
    }
  },
  successfulSave(trip) {
    tripList.fetch();
    $('.modal').css('display','none');
    $('#status-messages ul').empty();
    $('#status-messages ul').append(`<li>You added ${trip.get('name')}!</li>`);
    $('#status-messages').show();
    setTimeout(function() {$('#status-messages').hide()}, 3000);
  },
  failedSave(trip, response) {
    $('#status-messages ul').empty();
    Object.entries(response.responseJSON.errors).forEach((error) => {
      for(let i = 0; i < error[1].length; i++) {
        $('#status-messages ul').append(`<li>${error[0]}: ${error[1][i]}</li>`);
      }
    });
    $('#status-messages').show();
    setTimeout(function() {$('#status-messages').hide()}, 3000);
    trip.destroy();
  },
  addReservation(event) {
    event.preventDefault();
    const reservationData = {};
    reservationFields.forEach((field) => {
      $(`label[for=${field}] span`).remove();
      $(`input[name=${field}]`).removeClass('error');
      reservationData[field] = $(`#reservation-form input[name=${field}]`).val();
    });
    const r = new Reservation(reservationData);
    if (r.isValid()) {
      r.save({}, {
        url: $('form').attr('action'),
        success: events.successfulBook,
        error: events.failedBook,
      });
    } else {
      Object.entries(r.validationError).forEach((error) => {
        $(`label[for=${error[0]}] span`).remove();
        $(`label[for=${error[0]}]`).append(`<span class="error">: ${error[1]}</span>`);
        $(`input[name=${error[0]}]`).addClass('error');
      });
    }
  },
  successfulBook() {
    $('#status-messages ul').empty();
    $('#status-messages ul').append(`<li>Your reservation has been saved!</li>`);
    $('#status-messages').show();
    setTimeout(function() {$('#status-messages').hide()}, 3000);
  },
  failedBook(reservation, response) {
    $('#status-messages ul').empty();
    Object.entries(response.responseJSON.errors).forEach((error) => {
      $('#status-messages ul').append(`<li>${error[0]}: ${error[1]}</li>`);
    });
    $('#status-messages').show();
    setTimeout(function() {$('#status-messages').hide()}, 3000);
    reservation.destroy();
  },
  sortTrips() {
    console.log('you clicked a sort');
    // get class
    const classes = $(this).attr('class').split(/\s+/);
    // css styling
    if (!event.target.classList.contains('sort-up') && !event.target.classList.contains('sort-down')) {
      $('.sort').removeClass('sort-up');
      $('.sort').removeClass('sort-down');
    }
    // const classes = $(this).attr('class');
    $('.sort').removeClass('current-sort-field');
    $(this).addClass('current-sort-field');
    // $(this).addClass('sort-up');
    if (filteredTrips) {
      if (tripList.comparator === classes[1]) {
        filteredTrips.reverse();
        $(this).toggleClass('sort-up');
        $(this).toggleClass('sort-down');
      } else {
        $(this).toggleClass('sort-up');
        filteredTrips.sort(function(a, b) {
          const textA = a.get(classes[1]);
          const textB = b.get(classes[1]);
          return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
      }
      tripList.trigger('sort', filteredTrips);
      tripList.comparator = classes[1];
    } else {
      if (tripList.comparator === classes[1]) {
        tripList.models.reverse();
        tripList.trigger('sort', tripList);
        $(this).toggleClass('sort-up');
        $(this).toggleClass('sort-down');
      } else {
        $(this).toggleClass('sort-up');
        tripList.comparator = classes[1];
        tripList.sort();
      }
    }
  },
  filterTrips() {
    const category = $('#filter-category').val();
    const input = $('#filter-form input').val();
    const typing = input ? input.toLowerCase() : input;
    if (category && typing) {
      console.log('filter me!');
      const filter = _.filter(tripList.models, function(trip) {
        if (['name', 'continent', 'category'].includes(category)) {
          const tripName = trip.get(category).toLowerCase();
          return tripName.includes(typing);
        } else {
          const tripName = trip.get(category);
          return tripName <= typing;
        }
      });
      tripList.trigger('sort', filter);
      filteredTrips = filter;
    }
  },
}

console.log('it loaded!');

// -------------------------------------------------------
// Modal
const $modal = $('.modal');

$('#add-trip').on('click', function() {
  $modal.css('display', 'block');
});

$('#close').on('click', function(e) {
  e.preventDefault();
  $modal.css('display', 'none');
});
$('.close').on('click', function() {
  $modal.css('display', 'none');
});

$(window).on('click', function(event) {
  if (event.target.id == 'myModal') {
    $modal.css('display','none');
  }
});
// -------------------------------------------------------


$(document).ready( function() {

  // On Start
  tripList.fetch();

  $('#filter').hide();
  $('#trip-table').hide();
  $('#reservation').hide();
  $('#status-messages').hide();

  // Event Trigger
  $('#add-trip-form').submit(events.addTrip);
  $('#reservation-form').submit(events.addReservation);
  $('.sort').click(events.sortTrips);
  $('button#show-trips').click(events.showTrips);
  $('#trip-list').click('tr', events.showTrip);
  $('#filter-form input').keyup(events.filterTrips);
  $('select#filter-category').change(events.filterTrips);

  $('#filter-form input').keypress(function(e) {
    if (e.keyCode === 13) {
      e.preventDefault();
    }
  });

  tripList.on('update', render, tripList);
  tripList.on('sort', render, tripList);
});
