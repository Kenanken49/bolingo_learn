import click


@click.command()
@click.argument("name")
def greet(name):
    """Say hello to NAME.

    Works on its own (`python commands.py John`) and as a Flask CLI command
    (`flask --app app greet John`) once app.py registers it.
    """
    click.echo(f"Hello, {name}!")


if __name__ == "__main__":
    greet()
