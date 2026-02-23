# Hermes Server Test

## Run all test

```
pytest -v
```

## Run a specific file

```
pytest test_channels.py
```

## Run a specific test

```
pytest test_messages.py::test_message_delete_broadcast -v -s
```
